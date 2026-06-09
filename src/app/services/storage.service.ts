import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, from, timer, Subject, firstValueFrom, defer } from 'rxjs';
import { tap, map, retry, catchError, switchMap, finalize } from 'rxjs/operators';
import { SyncService } from './sync.service';
import { environment } from '../../environments/environment';

export interface FileItem {
  id: number;
  nom_original: string;
  type_mime: string;
  taille: number;
  folder_id: number | null;
  cloudinary_url?: string;
  is_deleted: boolean;
  created_at: string;
}

export interface FolderItem {
  id: number;
  nom: string;
  parent_id: number | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;
  private sync = inject(SyncService);

  private static readonly LS_FILES   = 'sapp_files';
  private static readonly LS_FOLDERS = 'sapp_folders';

  private _filesCache = new Map<string, FileItem[]>();
  private _foldersCache = new Map<string, FolderItem[]>();
  private _trashCache: FileItem[] | null = null;
  private _blobUrlCache = new Map<number, string>();
  private _blobUrlFailed = new Set<number>();
  private _cloudinaryConfig: { cloud_name: string; upload_preset: string } | null = null;
  readonly uploadDone$ = new Subject<{ done: number; total: number }>();

  constructor() {
    try {
      const f = localStorage.getItem(StorageService.LS_FILES);
      if (f) this._filesCache.set('root', JSON.parse(f));
      const d = localStorage.getItem(StorageService.LS_FOLDERS);
      if (d) this._foldersCache.set('root', JSON.parse(d));
    } catch { /* localStorage inaccessible ou données corrompues */ }
  }

  getCachedFiles(folderId?: number): FileItem[] | null {
    return this._filesCache.get(folderId != null ? String(folderId) : 'root') ?? null;
  }

  invalidateFilesCache(folderId?: number): void {
    this._filesCache.delete(folderId != null ? String(folderId) : 'root');
  }

  getCachedFolders(parentId?: number): FolderItem[] | null {
    return this._foldersCache.get(parentId != null ? String(parentId) : 'root') ?? null;
  }

  getCachedTrash(): FileItem[] | null { return this._trashCache; }

  getBlobUrl(fileId: number): Observable<string | null> {
    if (this._blobUrlCache.has(fileId)) return of(this._blobUrlCache.get(fileId)!);
    // Fichier déjà connu comme introuvable → pas de nouvelle requête
    if (this._blobUrlFailed.has(fileId)) return of(null);
    return this.http.get(this.downloadUrl(fileId), { responseType: 'blob' }).pipe(
      retry({
        count: 1,
        delay: (err) => {
          // Ne jamais réessayer un 404 — le fichier n'existe pas
          if (err instanceof HttpErrorResponse && err.status === 404) throw err;
          return timer(1000);
        }
      }),
      map(blob => {
        const url = URL.createObjectURL(blob);
        this._blobUrlCache.set(fileId, url);
        return url;
      }),
      catchError(() => {
        this._blobUrlFailed.add(fileId);
        return of(null);
      })
    );
  }

  // ── FICHIERS ────────────────────────────────────────────
  private getCloudinaryConfig(): Observable<{ cloud_name: string; upload_preset: string }> {
    if (this._cloudinaryConfig) return of(this._cloudinaryConfig);
    return this.http.get<{ cloud_name: string; upload_preset: string }>(`${this.api}/files/cloudinary-config`).pipe(
      tap(c => this._cloudinaryConfig = c)
    );
  }

  private async uploadToCloudinary(
    file: File,
    config: { cloud_name: string; upload_preset: string }
  ): Promise<{ secure_url: string; public_id: string }> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', config.upload_preset);
    fd.append('folder', 'storage');
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloud_name}/auto/upload`,
      { method: 'POST', body: fd }
    );
    if (!res.ok) throw new Error('Cloudinary upload failed');
    const data = await res.json();
    return { secure_url: data.secure_url, public_id: data.public_id };
  }

  private registerFile(data: {
    nom_original: string;
    type_mime: string;
    taille: number;
    cloudinary_url: string;
    public_id: string;
    folder_id?: number;
  }): Observable<FileItem> {
    return this.http.post<FileItem>(`${this.api}/files/register`, data);
  }

  private async _uploadOne(
    file: File,
    config: { cloud_name: string; upload_preset: string },
    folderId?: number
  ): Promise<FileItem | null> {
    try {
      const { secure_url, public_id } = await this.uploadToCloudinary(file, config);
      return await firstValueFrom(this.registerFile({
        nom_original: file.name,
        type_mime: file.type || 'application/octet-stream',
        taille: file.size,
        cloudinary_url: secure_url,
        public_id,
        folder_id: folderId,
      }));
    } catch {
      return null;
    }
  }

  private async _runUploads(
    files: File[],
    config: { cloud_name: string; upload_preset: string },
    folderId?: number
  ): Promise<FileItem[]> {
    let done = 0;
    const total = files.length;
    const BATCH = 3;
    const allResults: FileItem[] = [];

    for (let i = 0; i < files.length; i += BATCH) {
      const batch = files.slice(i, i + BATCH);
      const batchResults = await Promise.all(
        batch.map(async file => {
          const result = await this._uploadOne(file, config, folderId);
          done++;
          this.uploadDone$.next({ done, total });
          return result;
        })
      );
      allResults.push(...batchResults.filter((f): f is FileItem => f !== null));
    }
    return allResults;
  }

  uploadFiles(files: File[], folderId?: number): Observable<FileItem[]> {
    return this.getCloudinaryConfig().pipe(
      switchMap(config => from(this._runUploads(files, config, folderId)))
    );
  }

  getFiles(folderId?: number): Observable<FileItem[]> {
    const key = folderId != null ? String(folderId) : 'root';
    const url = folderId != null ? `${this.api}/files?folder_id=${folderId}` : `${this.api}/files`;
    return defer(() => { this.sync.start(); return this.http.get<FileItem[]>(url); }).pipe(
      tap(f => {
        this._filesCache.set(key, f);
        if (folderId == null) {
          try { localStorage.setItem(StorageService.LS_FILES, JSON.stringify(f)); } catch {}
        }
      }),
      finalize(() => this.sync.done())
    );
  }

  getTrash(): Observable<FileItem[]> {
    return this.http.get<FileItem[]>(`${this.api}/files/trash`).pipe(tap(f => this._trashCache = f));
  }

  downloadUrl(fileId: number): string {
    return `${this.api}/files/${fileId}/download`;
  }

  downloadBlob(fileId: number, filename: string): void {
    this.http.get(this.downloadUrl(fileId), { responseType: 'blob' }).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  deleteFile(fileId: number, permanent = false): Observable<unknown> {
    return this.http.delete(`${this.api}/files/${fileId}?permanent=${permanent}`);
  }

  restoreFile(fileId: number): Observable<FileItem> {
    return this.http.put<FileItem>(`${this.api}/files/${fileId}/restore`, {});
  }

  shareFile(fileId: number): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.api}/files/${fileId}/share`, {});
  }

  // ── DOSSIERS ────────────────────────────────────────────
  getFolders(parentId?: number): Observable<FolderItem[]> {
    const key = parentId != null ? String(parentId) : 'root';
    const url = parentId != null ? `${this.api}/folders?parent_id=${parentId}` : `${this.api}/folders`;
    return defer(() => { this.sync.start(); return this.http.get<FolderItem[]>(url); }).pipe(
      tap(f => {
        this._foldersCache.set(key, f);
        if (parentId == null) {
          try { localStorage.setItem(StorageService.LS_FOLDERS, JSON.stringify(f)); } catch {}
        }
      }),
      finalize(() => this.sync.done())
    );
  }

  clearLocalCache(): void {
    localStorage.removeItem(StorageService.LS_FILES);
    localStorage.removeItem(StorageService.LS_FOLDERS);
    this._filesCache.clear();
    this._foldersCache.clear();
    this._trashCache = null;
    this._blobUrlCache.clear();
    this._blobUrlFailed.clear();
  }

  createFolder(nom: string, parentId?: number): Observable<FolderItem> {
    return this.http.post<FolderItem>(`${this.api}/folders`, { nom, parent_id: parentId });
  }

  renameFolder(id: number, nom: string): Observable<FolderItem> {
    return this.http.put<FolderItem>(`${this.api}/folders/${id}`, { nom });
  }

  deleteFolder(id: number): Observable<unknown> {
    return this.http.delete(`${this.api}/folders/${id}`);
  }

  // ── ADMIN ────────────────────────────────────────────────
  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/users`);
  }

  createUser(data: { email: string; nom: string; prenom: string; password: string; quota_max: number }): Observable<any> {
    return this.http.post<any>(`${this.api}/users`, data);
  }

  updateUser(userId: number, data: { nom?: string; prenom?: string; email?: string; quota_max?: number; is_admin?: boolean }): Observable<any> {
    return this.http.put<any>(`${this.api}/users/${userId}`, data);
  }

  updateQuota(userId: number, quotaMax: number): Observable<unknown> {
    return this.http.put(`${this.api}/users/${userId}/quota`, { quota_max: quotaMax });
  }

  toggleUser(userId: number): Observable<unknown> {
    return this.http.put(`${this.api}/users/${userId}/toggle-active`, {});
  }

  deleteUser(userId: number): Observable<unknown> {
    return this.http.delete(`${this.api}/users/${userId}`);
  }

  // ── UTILITAIRES ──────────────────────────────────────────
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 o';
    const k = 1024;
    const sizes = ['o', 'Ko', 'Mo', 'Go', 'To'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getFileIcon(mime: string): string {
    if (mime.startsWith('image/')) return '🖼️';
    if (mime.startsWith('video/')) return '🎬';
    if (mime.startsWith('audio/')) return '🎵';
    if (mime.includes('pdf')) return '📄';
    if (mime.includes('word') || mime.includes('document')) return '📝';
    if (mime.includes('sheet') || mime.includes('excel')) return '📊';
    if (mime.includes('zip') || mime.includes('rar')) return '🗜️';
    return '📁';
  }

  isImage(mime: string): boolean { return mime.startsWith('image/'); }
  isVideo(mime: string): boolean { return mime.startsWith('video/'); }
  isAudio(mime: string): boolean { return mime.startsWith('audio/'); }
}
