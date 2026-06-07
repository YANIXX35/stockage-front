import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StorageService, FileItem, FolderItem } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';
import { timeout } from 'rxjs/operators';

@Component({ selector: 'app-drive', standalone: false, templateUrl: './drive.html', styleUrl: './drive.scss' })
export class Drive implements OnInit, OnDestroy {
  storage = inject(StorageService);
  auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

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

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.slowLoading = false;
    clearTimeout(this.slowTimer);
    this.slowTimer = setTimeout(() => this.slowLoading = true, 10000);
    this.storage.getFiles(this.currentFolderId).pipe(timeout(60000)).subscribe({
      next: f => { this.files = f; this.loading = false; this.slowLoading = false; clearTimeout(this.slowTimer); },
      error: () => { this.loading = false; this.loadError = true; this.slowLoading = false; clearTimeout(this.slowTimer); }
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

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const files = Array.from(input.files);
    this.uploading = true;
    this.uploadCount = files.length;
    this.storage.uploadFiles(files, this.currentFolderId).subscribe({
      next: () => {
        this.uploading = false;
        this.uploadCount = 0;
        this.auth.loadMe().subscribe();
        this.load();
        this.showToast(`${files.length} fichier${files.length > 1 ? 's uploadés' : ' uploadé'} avec succès`, 'success');
      },
      error: (err) => {
        this.uploading = false;
        this.uploadCount = 0;
        const detail = err?.error?.detail || 'Erreur lors de l\'upload';
        this.showToast(detail, 'error');
      }
    });
    input.value = '';
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
    this.toastTimer = setTimeout(() => this.toast = null, 3500);
  }
}
