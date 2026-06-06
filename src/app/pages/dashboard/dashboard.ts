import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { StorageService, FileItem } from '../../services/storage.service';
import { timeout } from 'rxjs/operators';

@Component({ selector: 'app-dashboard', standalone: false, templateUrl: './dashboard.html', styleUrl: './dashboard.scss' })
export class Dashboard implements OnInit {
  auth = inject(AuthService);
  storage = inject(StorageService);

  recentFiles: FileItem[] = [];
  totalFolders = 0;
  loading = true;
  loadError = false;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.auth.loadMe().subscribe();
    this.storage.getFiles().pipe(timeout(60000)).subscribe({
      next: f => { this.recentFiles = f.slice(-6).reverse(); this.loading = false; },
      error: () => { this.loading = false; this.loadError = true; }
    });
    this.storage.getFolders().pipe(timeout(60000)).subscribe({
      next: f => this.totalFolders = f.length,
      error: () => {}
    });
  }
}
