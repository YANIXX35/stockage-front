import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { StorageService, FileItem } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';
import { timeout } from 'rxjs/operators';

@Component({ selector: 'app-trash', standalone: false, templateUrl: './trash.html', styleUrl: './trash.scss' })
export class Trash implements OnInit, OnDestroy {
  storage = inject(StorageService);
  auth = inject(AuthService);
  files: FileItem[] = [];
  loading = true;
  loadError = false;
  slowLoading = false;
  pendingDeleteId: number | null = null;
  private slowTimer: any;

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { clearTimeout(this.slowTimer); }

  load(): void {
    const cached = this.storage.getCachedTrash();
    const hadCache = cached !== null;

    if (hadCache) {
      this.files = cached!;
      this.loading = false;
      this.loadError = false;
      this.slowLoading = false;
      clearTimeout(this.slowTimer);
    } else {
      this.loading = true;
      this.loadError = false;
      this.slowLoading = false;
      clearTimeout(this.slowTimer);
      this.slowTimer = setTimeout(() => this.slowLoading = true, 10000);
    }

    this.storage.getTrash().pipe(timeout(60000)).subscribe({
      next: f => { this.files = f; this.loading = false; this.slowLoading = false; clearTimeout(this.slowTimer); },
      error: () => { if (!hadCache) { this.loading = false; this.loadError = true; this.slowLoading = false; clearTimeout(this.slowTimer); } }
    });
  }

  restore(id: number): void {
    this.storage.restoreFile(id).subscribe(() => this.load());
  }

  deletePermanent(id: number): void {
    this.pendingDeleteId = id;
  }

  confirmDelete(): void {
    if (this.pendingDeleteId === null) return;
    const id = this.pendingDeleteId;
    this.pendingDeleteId = null;
    this.storage.deleteFile(id, true).subscribe(() => { this.auth.loadMe().subscribe(); this.load(); });
  }
}
