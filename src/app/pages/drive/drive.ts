import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StorageService, FileItem, FolderItem } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';

@Component({ selector: 'app-drive', standalone: false, templateUrl: './drive.html', styleUrl: './drive.scss' })
export class Drive implements OnInit {
  storage = inject(StorageService);
  auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  files: FileItem[] = [];
  folders: FolderItem[] = [];
  currentFolderId: number | undefined;
  loading = false;
  newFolderName = '';
  showNewFolder = false;
  shareToken = '';
  shareVisible = false;
  renameTarget: FolderItem | null = null;
  renameValue = '';

  ngOnInit(): void {
    this.route.queryParams.subscribe(p => {
      this.currentFolderId = p['folder'] ? +p['folder'] : undefined;
      this.load();
    });
  }

  load(): void {
    this.loading = true;
    this.storage.getFiles(this.currentFolderId).subscribe({ next: f => { this.files = f; this.loading = false; }, error: () => this.loading = false });
    this.storage.getFolders(this.currentFolderId).subscribe({ next: f => this.folders = f, error: () => {} });
  }

  openFolder(id: number): void {
    this.router.navigate(['/drive'], { queryParams: { folder: id } });
  }

  createFolder(): void {
    if (!this.newFolderName.trim()) return;
    this.storage.createFolder(this.newFolderName.trim(), this.currentFolderId).subscribe(() => { this.newFolderName = ''; this.showNewFolder = false; this.load(); });
  }

  deleteFolder(id: number): void {
    if (!confirm('Supprimer ce dossier ?')) return;
    this.storage.deleteFolder(id).subscribe(() => this.load());
  }

  startRename(f: FolderItem): void { this.renameTarget = f; this.renameValue = f.nom; }

  confirmRename(): void {
    if (!this.renameTarget || !this.renameValue.trim()) return;
    this.storage.renameFolder(this.renameTarget.id, this.renameValue.trim()).subscribe(() => { this.renameTarget = null; this.load(); });
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const files = Array.from(input.files);
    this.storage.uploadFiles(files, this.currentFolderId).subscribe({ next: () => { this.auth.loadMe().subscribe(); this.load(); }, error: () => alert('Erreur upload') });
    input.value = '';
  }

  deleteFile(id: number): void {
    if (!confirm('Mettre à la corbeille ?')) return;
    this.storage.deleteFile(id).subscribe(() => { this.auth.loadMe().subscribe(); this.load(); });
  }

  shareFile(id: number): void {
    this.storage.shareFile(id).subscribe(r => { this.shareToken = `${window.location.origin}/share/${r.token}`; this.shareVisible = true; });
  }

  copyShare(): void { navigator.clipboard.writeText(this.shareToken); }

  download(file: FileItem): void { this.storage.downloadBlob(file.id, file.nom_original); }
}
