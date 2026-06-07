import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { StorageService, FileItem } from '../../services/storage.service';
import { timeout } from 'rxjs/operators';

@Component({ selector: 'app-gallery', standalone: false, templateUrl: './gallery.html', styleUrl: './gallery.scss' })
export class Gallery implements OnInit, OnDestroy {
  storage = inject(StorageService);
  allFiles: FileItem[] = [];
  filter: 'all' | 'image' | 'video' | 'audio' | 'doc' = 'all';
  preview: FileItem | null = null;
  loading = true;
  loadError = false;
  slowLoading = false;
  private slowTimer: any;

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
    } else {
      this.loading = true;
      this.loadError = false;
      this.slowLoading = false;
      clearTimeout(this.slowTimer);
      this.slowTimer = setTimeout(() => this.slowLoading = true, 10000);
    }

    this.storage.getFiles().pipe(timeout(60000)).subscribe({
      next: f => { this.allFiles = f; this.loading = false; this.slowLoading = false; clearTimeout(this.slowTimer); },
      error: () => { if (!hadCache) { this.loading = false; this.loadError = true; this.slowLoading = false; clearTimeout(this.slowTimer); } }
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
