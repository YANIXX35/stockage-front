import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { StorageService, FileItem } from '../../services/storage.service';
import { timeout } from 'rxjs/operators';

@Component({ selector: 'app-gallery', standalone: false, templateUrl: './gallery.html', styleUrl: './gallery.scss' })
export class Gallery implements OnInit, OnDestroy {
  storage = inject(StorageService);
  private sanitizer = inject(DomSanitizer);
  allFiles: FileItem[] = [];
  filter: 'all' | 'image' | 'video' | 'audio' | 'doc' = 'all';
  preview: FileItem | null = null;
  loading = true;
  loadError = false;
  slowLoading = false;
  private slowTimer: any;
  blobUrls = new Map<number, SafeUrl>();

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { clearTimeout(this.slowTimer); }

  load(): void {
    const cached = this.storage.getCachedFiles();
    const hadCache = cached !== null;

    if (hadCache) {
      this.allFiles = cached!;
      this.loading = false;
      this.loadError = false;
      this.slowLoading = false;
      clearTimeout(this.slowTimer);
      this.loadThumbnails(cached!);
    } else {
      this.loading = true;
      this.loadError = false;
      this.slowLoading = false;
      clearTimeout(this.slowTimer);
      this.slowTimer = setTimeout(() => this.slowLoading = true, 10000);
    }

    this.storage.getFiles().pipe(timeout(60000)).subscribe({
      next: f => { this.allFiles = f; this.loading = false; this.slowLoading = false; clearTimeout(this.slowTimer); this.loadThumbnails(f); },
      error: () => { if (!hadCache) { this.loading = false; this.loadError = true; this.slowLoading = false; clearTimeout(this.slowTimer); } }
    });
  }

  getThumbUrl(f: FileItem): string {
    if (!f.cloudinary_url) return '';
    if (this.storage.isVideo(f.type_mime)) {
      return f.cloudinary_url.replace('/video/upload/', '/video/upload/w_300,h_300,c_fill,so_0,f_jpg/');
    }
    return f.cloudinary_url.replace('/image/upload/', '/image/upload/w_300,h_300,c_fill/');
  }

  getPreviewSrc(f: FileItem): string | SafeUrl {
    return f.cloudinary_url || this.blobUrls.get(f.id) || '';
  }

  private loadThumbnails(files: FileItem[]): void {
    files.filter(f => (this.storage.isImage(f.type_mime) || this.storage.isVideo(f.type_mime)) && !f.cloudinary_url).forEach(f => {
      if (!this.blobUrls.has(f.id)) {
        this.storage.getBlobUrl(f.id).subscribe(url => {
          if (url) this.blobUrls.set(f.id, this.sanitizer.bypassSecurityTrustUrl(url));
        });
      }
    });
  }

  get filtered(): FileItem[] {
    if (this.filter === 'all') return this.allFiles;
    if (this.filter === 'image') return this.allFiles.filter(f => this.storage.isImage(f.type_mime));
    if (this.filter === 'video') return this.allFiles.filter(f => this.storage.isVideo(f.type_mime));
    if (this.filter === 'audio') return this.allFiles.filter(f => this.storage.isAudio(f.type_mime));
    return this.allFiles.filter(f => !this.storage.isImage(f.type_mime) && !this.storage.isVideo(f.type_mime) && !this.storage.isAudio(f.type_mime));
  }

  download(file: FileItem): void {
    this.storage.downloadBlob(file.id, file.nom_original);
  }
}
