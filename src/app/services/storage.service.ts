import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FileItem {
  id: number;
  nom_original: string;
  type_mime: string;
  taille: number;
  folder_id: number | null;
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
  private api = environment.apiUrl;

  // ── FICHIERS ────────────────────────────────────────────
  uploadFiles(files: File[], folderId?: number): Observable<FileItem[]> {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    const url = folderId ? `${this.api}/files/upload?folder_id=${folderId}` : `${this.api}/files/upload`;
    return this.http.post<FileItem[]>(url, fd);
  }

  getFiles(folderId?: number): Observable<FileItem[]> {
    const url = folderId != null ? `${this.api}/files?folder_id=${folderId}` : `${this.api}/files`;
    return this.http.get<FileItem[]>(url);
  }

  getTrash(): Observable<FileItem[]> {
    return this.http.get<FileItem[]>(`${this.api}/files/trash`);
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
    const url = parentId != null ? `${this.api}/folders?parent_id=${parentId}` : `${this.api}/folders`;
    return this.http.get<FolderItem[]>(url);
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
