import { NgModule } from '@angular/core';
import { RouterModule, Routes, PreloadAllModules } from '@angular/router';
import { authGuard, adminGuard, guestGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', loadChildren: () => import('./pages/landing/landing-module').then(m => m.LandingModule) },
  { path: 'login', loadChildren: () => import('./pages/auth/auth-module').then(m => m.AuthModule), canActivate: [guestGuard] },
  { path: 'dashboard', loadChildren: () => import('./pages/dashboard/dashboard-module').then(m => m.DashboardModule), canActivate: [authGuard] },
  { path: 'drive', loadChildren: () => import('./pages/drive/drive-module').then(m => m.DriveModule), canActivate: [authGuard] },
  { path: 'gallery', loadChildren: () => import('./pages/gallery/gallery-module').then(m => m.GalleryModule), canActivate: [authGuard] },
  { path: 'trash', loadChildren: () => import('./pages/trash/trash-module').then(m => m.TrashModule), canActivate: [authGuard] },
  { path: 'settings', loadChildren: () => import('./pages/settings/settings-module').then(m => m.SettingsModule), canActivate: [authGuard] },
  { path: 'admin', loadChildren: () => import('./pages/admin/admin-module').then(m => m.AdminModule), canActivate: [adminGuard] },
  { path: 'share/:token', loadChildren: () => import('./pages/share/share-module').then(m => m.ShareModule) },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    preloadingStrategy: PreloadAllModules,
    scrollPositionRestoration: 'enabled'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
