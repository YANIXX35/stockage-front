import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { StorageService, FileItem } from '../../services/storage.service';

@Component({ selector: 'app-dashboard', standalone: false, templateUrl: './dashboard.html', styleUrl: './dashboard.scss' })
export class Dashboard implements OnInit, OnDestroy {
  auth    = inject(AuthService);
  storage = inject(StorageService);
  private sanitizer = inject(DomSanitizer);

  recentFiles: FileItem[] = [];
  totalFiles   = 0;
  totalFolders = 0;
  loading      = true;
  loadError    = false;
  slowLoading  = false;
  readonly skeletonItems = [1, 2, 3, 4, 5, 6];
  blobUrls = new Map<number, SafeUrl>();

  private _subs: Subscription[] = [];
  private _slowTimer: any;

  ngOnInit(): void {
    // Abonnement à l'état global — s'affiche instantanément si les données sont déjà là
    this._subs.push(
      this.storage.files$.subscribe(files => {
        if (files === null) return;
        this.totalFiles  = files.length;
        this.recentFiles = files.slice(-6).reverse();
        this.loading     = false;
        this.loadError   = false;
        this.slowLoading = false;
        clearTimeout(this._slowTimer);
        this._loadThumbnails(this.recentFiles);
      }),
      this.storage.folders$.subscribe(folders => {
        if (folders !== null) this.totalFolders = folders.length;
      })
    );

    // Affiche le skeleton timer seulement si aucune donnée en cache
    if (this.storage.getCachedFiles() === null) {
      this._slowTimer = setTimeout(() => this.slowLoading = true, 10000);
    }
  }

  ngOnDestroy(): void {
    this._subs.forEach(s => s.unsubscribe());
    clearTimeout(this._slowTimer);
  }

  retry(): void {
    this.loading     = true;
    this.loadError   = false;
    this.slowLoading = false;
    this.storage.getFiles().subscribe({ error: () => { this.loading = false; this.loadError = true; } });
    this.storage.getFolders().subscribe();
  }

  getThumbUrl(f: FileItem): string {
    if (!f.cloudinary_url) return '';
    if (this.storage.isVideo(f.type_mime)) {
      return f.cloudinary_url.replace('/video/upload/', '/video/upload/w_300,h_300,c_fill,so_0,f_jpg/');
    }
    return f.cloudinary_url.replace('/image/upload/', '/image/upload/w_300,h_300,c_fill/');
  }

  private _loadThumbnails(files: FileItem[]): void {
    files.filter(f => (this.storage.isImage(f.type_mime) || this.storage.isVideo(f.type_mime)) && !f.cloudinary_url).forEach(f => {
      if (!this.blobUrls.has(f.id)) {
        this.storage.getBlobUrl(f.id).subscribe(url => {
          if (url) this.blobUrls.set(f.id, this.sanitizer.bypassSecurityTrustUrl(url));
        });
      }
    });
  }
}
