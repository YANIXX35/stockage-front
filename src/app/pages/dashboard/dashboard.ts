import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { AuthService } from '../../services/auth.service';
import { StorageService, FileItem } from '../../services/storage.service';
import { timeout } from 'rxjs/operators';

@Component({ selector: 'app-dashboard', standalone: false, templateUrl: './dashboard.html', styleUrl: './dashboard.scss' })
export class Dashboard implements OnInit, OnDestroy {
  auth = inject(AuthService);
  storage = inject(StorageService);
  private sanitizer = inject(DomSanitizer);

  recentFiles: FileItem[] = [];
  totalFiles = 0;
  totalFolders = 0;
  loading = true;
  loadError = false;
  slowLoading = false;
  private slowTimer: any;
  blobUrls = new Map<number, SafeUrl>();

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { clearTimeout(this.slowTimer); }

  private loadThumbnails(files: FileItem[]): void {
    files.filter(f => this.storage.isImage(f.type_mime) || this.storage.isVideo(f.type_mime)).forEach(f => {
      if (!this.blobUrls.has(f.id)) {
        if (f.cloudinary_url) {
          this.blobUrls.set(f.id, this.sanitizer.bypassSecurityTrustUrl(f.cloudinary_url));
        } else {
          this.storage.getBlobUrl(f.id).subscribe(url => {
            if (url) this.blobUrls.set(f.id, this.sanitizer.bypassSecurityTrustUrl(url));
          });
        }
      }
    });
  }

  load(): void {
    const cachedFiles = this.storage.getCachedFiles();
    const cachedFolders = this.storage.getCachedFolders();
    const hadCache = cachedFiles !== null;

    if (hadCache) {
      this.totalFiles = cachedFiles!.length;
      this.recentFiles = cachedFiles!.slice(-6).reverse();
      this.loading = false;
      this.loadError = false;
      this.slowLoading = false;
      clearTimeout(this.slowTimer);
      this.loadThumbnails(this.recentFiles);
    } else {
      this.loading = true;
      this.loadError = false;
      this.slowLoading = false;
      clearTimeout(this.slowTimer);
      this.slowTimer = setTimeout(() => this.slowLoading = true, 10000);
    }
    if (cachedFolders !== null) this.totalFolders = cachedFolders.length;

    this.auth.loadMe().subscribe();
    this.storage.getFiles().pipe(timeout(60000)).subscribe({
      next: f => {
        this.totalFiles = f.length;
        this.recentFiles = f.slice(-6).reverse();
        this.loading = false; this.slowLoading = false; clearTimeout(this.slowTimer);
        this.loadThumbnails(this.recentFiles);
      },
      error: () => { if (!hadCache) { this.loading = false; this.loadError = true; this.slowLoading = false; clearTimeout(this.slowTimer); } }
    });
    this.storage.getFolders().pipe(timeout(60000)).subscribe({
      next: f => this.totalFolders = f.length,
      error: () => {}
    });
  }
}
