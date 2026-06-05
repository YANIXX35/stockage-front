import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { StorageService, FileItem, FolderItem } from '../../services/storage.service';

@Component({ selector: 'app-dashboard', standalone: false, templateUrl: './dashboard.html', styleUrl: './dashboard.scss' })
export class Dashboard implements OnInit {
  auth = inject(AuthService);
  storage = inject(StorageService);

  recentFiles: FileItem[] = [];
  totalFolders = 0;
  loading = true;

  ngOnInit(): void {
    this.auth.loadMe().subscribe();
    this.storage.getFiles().subscribe({ next: f => { this.recentFiles = f.slice(-6).reverse(); this.loading = false; }, error: () => this.loading = false });
    this.storage.getFolders().subscribe({ next: f => this.totalFolders = f.length, error: () => {} });
  }
}
