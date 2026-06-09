import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './services/auth.service';
import { StorageService } from './services/storage.service';
import { environment } from '../environments/environment';
import { catchError, of } from 'rxjs';

@Component({ selector: 'app-root', standalone: false, template: '<router-outlet></router-outlet>' })
export class App implements OnInit {
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private storage = inject(StorageService);

  ngOnInit(): void {
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    this.http.get(`${baseUrl}/health`).pipe(catchError(() => of(null))).subscribe();

    if (this.auth.token) {
      this.auth.silentRefresh();
      this.auth.loadMe().subscribe();
      // Pré-charge le cache silencieusement dès le démarrage
      this.storage.getFiles().pipe(catchError(() => of([]))).subscribe();
      this.storage.getFolders().pipe(catchError(() => of([]))).subscribe();
      this.storage.getTrash().pipe(catchError(() => of([]))).subscribe();
    }
  }
}
