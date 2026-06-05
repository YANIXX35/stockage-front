import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { StorageService } from '../../services/storage.service';

@Component({ selector: 'app-share-view', standalone: false, templateUrl: './share-view.html', styleUrl: './share-view.scss' })
export class ShareView implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  storage = inject(StorageService);
  info: any = null;
  error = '';
  token = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    this.http.get(`${environment.apiUrl}/share/${this.token}/info`).subscribe({
      next: (data: any) => this.info = data,
      error: () => this.error = 'Lien invalide ou expiré'
    });
  }

  download(): void { window.open(`${environment.apiUrl}/share/${this.token}/download`, '_blank'); }
}
