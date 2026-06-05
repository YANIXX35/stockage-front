import { Component, OnInit, inject } from '@angular/core';
import { StorageService, FileItem } from '../../services/storage.service';

@Component({ selector: 'app-gallery', standalone: false, templateUrl: './gallery.html', styleUrl: './gallery.scss' })
export class Gallery implements OnInit {
  storage = inject(StorageService);
  allFiles: FileItem[] = [];
  filter: 'all' | 'image' | 'video' | 'audio' | 'doc' = 'all';
  preview: FileItem | null = null;
  loading = true;

  ngOnInit(): void {
    this.storage.getFiles().subscribe({ next: f => { this.allFiles = f; this.loading = false; }, error: () => this.loading = false });
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
