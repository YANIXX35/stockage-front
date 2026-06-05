import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

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
  private http = inject(HttpClient);
  private router = inject(Router);
  private api = environment.apiUrl;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

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

  register(data: { email: string; nom: string; prenom: string; password: string }): Observable<User> {
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
      tap(user => this.currentUserSubject.next(user))
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
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
