import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { StorageService, FileItem, FolderItem, UploadProgress } from '../../services/storage.service';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { timeout } from 'rxjs/operators';

@Component({ selector: 'app-drive', standalone: false, templateUrl: './drive.html', styleUrl: './drive.scss' })
export class Drive implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  storage = inject(StorageService);
  auth = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  blobUrls = new Map<number, SafeUrl>();

  files: FileItem[] = [];
  folders: FolderItem[] = [];
  currentFolderId: number | undefined;

  // États de chargement
  loading = true;
  loadError = false;
  slowLoading = false;
  private slowTimer: any;
  uploading = false;
  uploadCount = 0;
  uploadDone = 0;
  totalUploadBytes = 0;
  loadedUploadBytes = 0;
  get uploadPct(): number {
    if (!this.totalUploadBytes) return 0;
    return Math.min(100, Math.round(this.loadedUploadBytes / this.totalUploadBytes * 100));
  }

  // Nouveau dossier
  newFolderName = '';
  showNewFolder = false;

  // Renommage
  renameTarget: FolderItem | null = null;
  renameValue = '';

  // Partage
  shareToken = '';
  shareVisible = false;

  // Toast notifications
  toast: { msg: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any;

  readonly skeletonRows = [1,2,3,4,5,6,7,8];

  // Confirmation suppression (remplace confirm() natif)
  pendingDelete: { type: 'file' | 'folder'; id: number; label: string } | null = null;

  ngOnInit(): void {
    this.route.queryParams.subscribe(p => {
      this.currentFolderId = p['folder'] ? +p['folder'] : undefined;
      this.load();
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.toastTimer);
    clearTimeout(this.slowTimer);
  }

  getThumbUrl(f: FileItem): string {
    if (!f.cloudinary_url) return '';
    if (this.storage.isVideo(f.type_mime)) {
      return f.cloudinary_url.replace('/video/upload/', '/video/upload/w_80,h_80,c_fill,so_0,f_jpg/');
    }
    return f.cloudinary_url.replace('/image/upload/', '/image/upload/w_80,h_80,c_fill/');
  }

  private loadThumbnails(files: FileItem[]): void {
    files.filter(f => !f.cloudinary_url && (this.storage.isImage(f.type_mime) || this.storage.isVideo(f.type_mime))).forEach(f => {
      if (!this.blobUrls.has(f.id)) {
        this.storage.getBlobUrl(f.id).subscribe(url => {
          if (url) { this.blobUrls.set(f.id, this.sanitizer.bypassSecurityTrustUrl(url)); this.cdr.detectChanges(); }
        });
      }
    });
  }

  load(): void {
    const cachedFiles = this.storage.getCachedFiles(this.currentFolderId);
    const cachedFolders = this.storage.getCachedFolders(this.currentFolderId);
    const hadCache = cachedFiles !== null;

    if (hadCache) {
      this.files = cachedFiles!;
      this.loading = false;
      this.loadError = false;
      this.slowLoading = false;
      clearTimeout(this.slowTimer);
      this.loadThumbnails(cachedFiles!);
    } else {
      this.loading = true;
      this.loadError = false;
      this.slowLoading = false;
      clearTimeout(this.slowTimer);
      this.slowTimer = setTimeout(() => this.slowLoading = true, 10000);
    }
    if (cachedFolders !== null) this.folders = cachedFolders;

    this.storage.getFiles(this.currentFolderId).pipe(timeout(60000)).subscribe({
      next: f => { this.files = f; this.loading = false; this.slowLoading = false; clearTimeout(this.slowTimer); this.loadThumbnails(f); },
      error: () => { if (!hadCache) { this.loading = false; this.loadError = true; this.slowLoading = false; clearTimeout(this.slowTimer); } }
    });
    this.storage.getFolders(this.currentFolderId).pipe(timeout(60000)).subscribe({
      next: f => this.folders = f,
      error: () => {}
    });
  }

  openFolder(id: number): void {
    this.router.navigate(['/drive'], { queryParams: { folder: id } });
  }

  // ── DOSSIERS ──────────────────────────────────────────────

  createFolder(): void {
    if (!this.newFolderName.trim()) return;
    this.storage.createFolder(this.newFolderName.trim(), this.currentFolderId).subscribe({
      next: () => {
        this.newFolderName = '';
        this.showNewFolder = false;
        this.load();
        this.showToast('Dossier créé', 'success');
      },
      error: () => this.showToast('Erreur création dossier', 'error')
    });
  }

  startRename(f: FolderItem): void { this.renameTarget = f; this.renameValue = f.nom; }

  confirmRename(): void {
    if (!this.renameTarget || !this.renameValue.trim()) return;
    this.storage.renameFolder(this.renameTarget.id, this.renameValue.trim()).subscribe({
      next: () => { this.renameTarget = null; this.load(); this.showToast('Dossier renommé', 'success'); },
      error: () => this.showToast('Erreur renommage', 'error')
    });
  }

  askDeleteFolder(f: FolderItem): void {
    this.pendingDelete = { type: 'folder', id: f.id, label: f.nom };
  }

  // ── FICHIERS ──────────────────────────────────────────────

  triggerUpload(): void {
    this.fileInput.nativeElement.click();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const files = Array.from(input.files);
    input.value = '';
    this.uploading = true;
    this.uploadCount = files.length;
    this.uploadDone = 0;
    this.totalUploadBytes = files.reduce((s, f) => s + f.size, 0);
    this.loadedUploadBytes = 0;

    const progressSub = this.storage.uploadDone$.subscribe((p: UploadProgress) => {
      this.uploadDone = p.done;
      this.loadedUploadBytes = p.loadedBytes;
      this.cdr.detectChanges();
    });

    // Chaque fichier apparaît dans la liste dès que son upload est terminé
    const fileSub: Subscription = this.storage.uploadFile$.subscribe(file => {
      this.files = [...this.files, file];
      this.loadThumbnails([file]);
      this.cdr.detectChanges();
    });

    this.storage.uploadFiles(files, this.currentFolderId).subscribe({
      next: () => {
        progressSub.unsubscribe();
        fileSub.unsubscribe();
        this.uploading = false;
        this.uploadCount = 0;
        this.uploadDone = 0;
        this.totalUploadBytes = 0;
        this.loadedUploadBytes = 0;
        this.storage.invalidateFilesCache(this.currentFolderId);
        this.auth.loadMe().subscribe();
        const n = this.uploadDone;
        const failed = files.length - n;
        const msg = n > 0
          ? `${n} fichier${n > 1 ? 's uploadés' : ' uploadé'} avec succès${failed > 0 ? ` (${failed} échoué${failed > 1 ? 's' : ''})` : ''}`
          : `Échec de l'upload (${failed} fichier${failed > 1 ? 's' : ''})`;
        this.showToast(msg, n > 0 ? 'success' : 'error');
      },
      error: (err) => {
        progressSub.unsubscribe();
        fileSub.unsubscribe();
        this.uploading = false;
        this.uploadCount = 0;
        this.uploadDone = 0;
        this.totalUploadBytes = 0;
        this.loadedUploadBytes = 0;
        const detail = err?.error?.detail || 'Erreur lors de l\'upload';
        this.showToast(detail, 'error');
      }
    });
  }

  askDeleteFile(f: FileItem): void {
    this.pendingDelete = { type: 'file', id: f.id, label: f.nom_original };
  }

  shareFile(id: number): void {
    this.storage.shareFile(id).subscribe({
      next: r => { this.shareToken = `${window.location.origin}/share/${r.token}`; this.shareVisible = true; },
      error: () => this.showToast('Erreur création du lien', 'error')
    });
  }

  copyShare(): void {
    navigator.clipboard.writeText(this.shareToken);
    this.showToast('Lien copié !', 'success');
    this.shareVisible = false;
  }

  download(file: FileItem): void { this.storage.downloadBlob(file.id, file.nom_original); }

  // ── CONFIRMATION ──────────────────────────────────────────

  confirmPending(): void {
    if (!this.pendingDelete) return;
    if (this.pendingDelete.type === 'file') {
      this.storage.deleteFile(this.pendingDelete.id).subscribe({
        next: () => { this.auth.loadMe().subscribe(); this.load(); this.showToast('Fichier déplacé à la corbeille', 'success'); },
        error: () => this.showToast('Erreur suppression', 'error')
      });
    } else {
      this.storage.deleteFolder(this.pendingDelete.id).subscribe({
        next: () => { this.load(); this.showToast('Dossier supprimé', 'success'); },
        error: () => this.showToast('Erreur suppression', 'error')
      });
    }
    this.pendingDelete = null;
  }

  cancelPending(): void { this.pendingDelete = null; }

  // ── TOAST ─────────────────────────────────────────────────

  showToast(msg: string, type: 'success' | 'error'): void {
    this.toast = { msg, type };
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast = null, 5000);
  }
}
