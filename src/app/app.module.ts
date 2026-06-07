import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { RouteReuseStrategy, ActivatedRouteSnapshot, DetachedRouteHandle } from '@angular/router';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { authInterceptor } from './interceptors/auth.interceptor';

class AlwaysCreateRouteReuseStrategy implements RouteReuseStrategy {
  shouldDetach(_: ActivatedRouteSnapshot): boolean { return false; }
  store(_r: ActivatedRouteSnapshot, _h: DetachedRouteHandle | null): void {}
  shouldAttach(_: ActivatedRouteSnapshot): boolean { return false; }
  retrieve(_: ActivatedRouteSnapshot): DetachedRouteHandle | null { return null; }
  shouldReuseRoute(_f: ActivatedRouteSnapshot, _c: ActivatedRouteSnapshot): boolean { return false; }
}

@NgModule({
  declarations: [App],
  imports: [BrowserModule, AppRoutingModule],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: RouteReuseStrategy, useClass: AlwaysCreateRouteReuseStrategy }
  ],
  bootstrap: [App]
})
export class AppModule {}
