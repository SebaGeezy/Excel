import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('🛡️ authGuard - Verificando autenticación...');
  console.log('🔍 isAuthenticated:', authService.isAuthenticated());
  console.log('🔍 Token:', !!authService.getToken());
  console.log('🔍 Usuario:', authService.getCurrentUser());

  if (authService.isAuthenticated()) {
    console.log('✅ authGuard - Usuario autenticado, permitir acceso');
    return true;
  }

  console.log('❌ authGuard - Usuario NO autenticado, redirigir a login');
  router.navigate(['/login']);
  return false;
};