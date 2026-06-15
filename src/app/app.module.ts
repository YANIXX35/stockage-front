import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { RouteReuseStrategy, ActivatedRouteSnapshot, DetachedRouteHandle } from '@angular/router';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { authInterceptor } from './interceptors/auth.interceptor';

class SmartReuseStrategy implements RouteReuseStrategy {
  // Sections dont on garde le composant en mémoire pour un retour instantané
  private static readonly CACHE = new Set(['dashboard', 'drive', 'gallery', 'trash', 'settings', 'admin']);
  private _handles = new Map<string, DetachedRouteHandle>();

  private _key(route: ActivatedRouteSnapshot): string {
    return route.pathFromRoot
      .map(r => r.routeConfig?.path ?? '')
      .filter(Boolean)
      .join('/');
  }

  shouldReuseRoute(f: ActivatedRouteSnapshot, c: ActivatedRouteSnapshot): boolean {
    return f.routeConfig === c.routeConfig;
  }

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return SmartReuseStrategy.CACHE.has(this._key(route));
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    const key = this._key(route);
    if (handle) this._handles.set(key, handle);
    else this._handles.delete(key);
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return this._handles.has(this._key(route));
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    return this._handles.get(this._key(route)) ?? null;
  }
}

@NgModule({
  declarations: [App],
  imports: [BrowserModule, AppRoutingModule],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: RouteReuseStrategy, useClass: SmartReuseStrategy }
  ],
  bootstrap: [App]
})
export class AppModule {}
