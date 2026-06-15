import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { StorageService, FileItem } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';

@Component({ selector: 'app-trash', standalone: false, templateUrl: './trash.html', styleUrl: './trash.scss' })
export class Trash implements OnInit, OnDestroy {
  storage = inject(StorageService);
  auth    = inject(AuthService);

  files: FileItem[] = [];
  loading      = true;
  loadError    = false;
  slowLoading  = false;
  pendingDeleteId: number | null = null;

  private _sub!: Subscription;
  private _slowTimer: any;

  ngOnInit(): void {
    this._sub = this.storage.trash$.subscribe(files => {
      if (files === null) return;
      this.files      = files;
      this.loading    = false;
      this.loadError  = false;
      this.slowLoading = false;
      clearTimeout(this._slowTimer);
    });

    if (this.storage.getCachedTrash() === null) {
      this._slowTimer = setTimeout(() => this.slowLoading = true, 10000);
    }
  }

  ngOnDestroy(): void {
    this._sub?.unsubscribe();
    clearTimeout(this._slowTimer);
  }

  restore(id: number): void {
    this.storage.restoreFile(id).subscribe(() => {
      // Met à jour la corbeille sans recharger
      this.storage.getTrash().subscribe();
      // Met aussi à jour les fichiers
      this.storage.getFiles().subscribe();
    });
  }

  deletePermanent(id: number): void {
    this.pendingDeleteId = id;
  }

  retry(): void {
    this.loading   = true;
    this.loadError = false;
    this.storage.getTrash().subscribe({ error: () => { this.loading = false; this.loadError = true; } });
  }

  confirmDelete(): void {
    if (this.pendingDeleteId === null) return;
    const id = this.pendingDeleteId;
    this.pendingDeleteId = null;
    this.storage.deleteFile(id, true).subscribe(() => {
      this.auth.loadMe().subscribe();
      this.storage.getTrash().subscribe();
    });
  }
}
