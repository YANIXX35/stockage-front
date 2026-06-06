import { Component, OnInit, inject } from '@angular/core';
import { StorageService, FileItem } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';
import { timeout } from 'rxjs';

@Component({ selector: 'app-trash', standalone: false, templateUrl: './trash.html', styleUrl: './trash.scss' })
export class Trash implements OnInit {
  storage = inject(StorageService);
  auth = inject(AuthService);
  files: FileItem[] = [];
  loading = true;
  loadError = false;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.storage.getTrash().pipe(timeout(20000)).subscribe({
      next: f => { this.files = f; this.loading = false; },
      error: () => { this.loading = false; this.loadError = true; }
    });
  }

  restore(id: number): void {
    this.storage.restoreFile(id).subscribe(() => this.load());
  }

  deletePermanent(id: number): void {
    if (!confirm('Supprimer définitivement ? Cette action est irréversible.')) return;
    this.storage.deleteFile(id, true).subscribe(() => { this.auth.loadMe().subscribe(); this.load(); });
  }
}
