import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationStart, NavigationEnd, NavigationError, NavigationCancel } from '@angular/router';
import { AuthService } from './services/auth.service';
import { StorageService } from './services/storage.service';
import { SyncService } from './services/sync.service';
import { environment } from '../environments/environment';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: false,
  template: `
    @if (navigating) { <div class="nav-bar"></div> }
    <router-outlet></router-outlet>
  `
})
export class App implements OnInit, OnDestroy {
  navigating = false;
  private auth    = inject(AuthService);
  private http    = inject(HttpClient);
  private router  = inject(Router);
  private storage = inject(StorageService);
  private sync    = inject(SyncService);

  private _lastVisibilitySync = 0;

  private _onOnline = () => {
    this.sync.setOffline(false);
    if (this.auth.token) { this._refreshAll(); }
  };
  private _onOffline = () => this.sync.setOffline(true);
  private _onVisibility = () => {
    if (document.visibilityState === 'visible' && this.auth.token) {
      const elapsed = Date.now() - this._lastVisibilitySync;
      if (elapsed > 2 * 60 * 1000) {
        this._lastVisibilitySync = Date.now();
        this._refreshAll();
      }
    }
  };

  ngOnInit(): void {
    // Barre de progression navigation
    this.router.events.subscribe(e => {
      if (e instanceof NavigationStart)  this.navigating = true;
      if (e instanceof NavigationEnd || e instanceof NavigationError || e instanceof NavigationCancel)
        this.navigating = false;
    });

    // Réveil du backend Render
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    this.http.get(`${baseUrl}/health`).pipe(catchError(() => of(null))).subscribe();

    // État offline initial
    this.sync.setOffline(!navigator.onLine);

    // Événements réseau et visibilité
    window.addEventListener('online',  this._onOnline);
    window.addEventListener('offline', this._onOffline);
    document.addEventListener('visibilitychange', this._onVisibility);

    if (this.auth.token) {
      this.auth.silentRefresh();
      this.auth.loadMe().subscribe();
      this._refreshAll();
      this._lastVisibilitySync = Date.now();
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('online',  this._onOnline);
    window.removeEventListener('offline', this._onOffline);
    document.removeEventListener('visibilitychange', this._onVisibility);
  }

  private _refreshAll(): void {
    this.storage.getFiles().pipe(catchError(() => of([]))).subscribe();
    this.storage.getFolders().pipe(catchError(() => of([]))).subscribe();
    this.storage.getTrash().pipe(catchError(() => of([]))).subscribe();
  }
}
