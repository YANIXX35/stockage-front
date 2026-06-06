import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './services/auth.service';
import { environment } from '../environments/environment';
import { catchError, of } from 'rxjs';

@Component({ selector: 'app-root', standalone: false, template: '<router-outlet></router-outlet>' })
export class App implements OnInit {
  private auth = inject(AuthService);
  private http = inject(HttpClient);

  ngOnInit(): void {
    // Ping le backend dès le démarrage pour réveiller Render (cold start ~30s sur free tier)
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    this.http.get(`${baseUrl}/`).pipe(catchError(() => of(null))).subscribe();

    if (this.auth.token) this.auth.loadMe().subscribe();
  }
}
