import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Auth } from '../services/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const requiredRoles = route.data?.['roles'] as Array<string>;

  const currentRole = auth.getRole();

  if (!currentRole) {
    router.navigate(['/login']);
    return false;
  }

  if (requiredRoles && !requiredRoles.includes(currentRole)) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
