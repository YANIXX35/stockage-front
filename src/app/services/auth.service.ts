import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { StorageService } from './storage.service';

export interface User {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  quota_max: number;
  quota_used: number;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http    = inject(HttpClient);
  private router  = inject(Router);
  private storage = inject(StorageService);
  private api = environment.apiUrl;

  private static readonly LS_USER = 'sapp_user';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    // Restaure l'utilisateur depuis localStorage au démarrage (affichage immédiat)
    try {
      const saved = localStorage.getItem(AuthService.LS_USER);
      if (saved) this.currentUserSubject.next(JSON.parse(saved));
    } catch { /* données corrompues → ignoré */ }
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get token(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }

  isAdmin(): boolean {
    return this.currentUser?.is_admin ?? false;
  }

  sendOtp(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/auth/send-otp`, { email });
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/auth/forgot-password`, { email });
  }

  resetPassword(email: string, otp: string, new_password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/auth/reset-password`, { email, otp, new_password });
  }

  register(data: { email: string; nom: string; prenom: string; password: string; otp: string }): Observable<User> {
    return this.http.post<User>(`${this.api}/auth/register`, data);
  }

  login(email: string, password: string): Observable<{ access_token: string }> {
    return this.http.post<{ access_token: string }>(`${this.api}/auth/login`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem('token', res.access_token);
        this.loadMe().subscribe();
      })
    );
  }

  loadMe(): Observable<User> {
    return this.http.get<User>(`${this.api}/auth/me`).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        try { localStorage.setItem(AuthService.LS_USER, JSON.stringify(user)); } catch {}
      })
    );
  }

  silentRefresh(): void {
    if (!this.isLoggedIn()) return;
    const token = this.token!;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = payload.exp * 1000;
      const now = Date.now();
      const daysLeft = (expiresAt - now) / (1000 * 60 * 60 * 24);
      if (daysLeft < 15) {
        this.http.post<{ access_token: string }>(`${this.api}/auth/refresh`, {}).pipe(
          catchError(() => of(null))
        ).subscribe(res => {
          if (res) localStorage.setItem('token', res.access_token);
        });
      }
    } catch { /* token malformé → intercepteur 401 gère la déconnexion */ }
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem(AuthService.LS_USER);
    this.storage.clearLocalCache();
    this.currentUserSubject.next(null);
    this.router.navigate(['/login/login']);
  }

  quotaPercent(): number {
    const u = this.currentUser;
    if (!u || u.quota_max === 0) return 0;
    return Math.round((u.quota_used / u.quota_max) * 100);
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 o';
    const k = 1024;
    const sizes = ['o', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
