import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { StorageService, FileItem } from '../../services/storage.service';
import { timeout } from 'rxjs/operators';

@Component({ selector: 'app-dashboard', standalone: false, templateUrl: './dashboard.html', styleUrl: './dashboard.scss' })
export class Dashboard implements OnInit, OnDestroy {
  auth = inject(AuthService);
  storage = inject(StorageService);

  recentFiles: FileItem[] = [];
  totalFolders = 0;
  loading = true;
  loadError = false;
  slowLoading = false;
  private slowTimer: any;

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { clearTimeout(this.slowTimer); }

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.slowLoading = false;
    clearTimeout(this.slowTimer);
    this.slowTimer = setTimeout(() => this.slowLoading = true, 10000);
    this.auth.loadMe().subscribe();
    this.storage.getFiles().pipe(timeout(60000)).subscribe({
      next: f => { this.recentFiles = f.slice(-6).reverse(); this.loading = false; this.slowLoading = false; clearTimeout(this.slowTimer); },
      error: () => { this.loading = false; this.loadError = true; this.slowLoading = false; clearTimeout(this.slowTimer); }
    });
    this.storage.getFolders().pipe(timeout(60000)).subscribe({
      next: f => this.totalFolders = f.length,
      error: () => {}
    });
  }
}
