import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigate(['/login/login']);
  return false;
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/login/login']);
    return false;
  }

  if (auth.currentUser !== null) {
    if (auth.isAdmin()) return true;
    router.navigate(['/dashboard']);
    return false;
  }

  // Token présent mais currentUser pas encore chargé (ex: refresh page) — attendre loadMe()
  return auth.loadMe().pipe(
    map(user => {
      if (user.is_admin) return true;
      router.navigate(['/dashboard']);
      return false;
    }),
    catchError(() => {
      router.navigate(['/dashboard']);
      return of(false);
    })
  );
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return true;
  router.navigate(['/dashboard']);
  return false;
};
