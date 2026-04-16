import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { ProfileViewComponent } from './profile-view/profile-view';
import { ManageUsers } from './pages/admin/manage-users/manage-users';
import { LandingPage } from './pages/landing/landing';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { RequestsComponent } from './pages/requests/requests';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', component: LandingPage },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'forgot-password', component: ForgotPassword },
  
  // Protected Routes - Switching back to unified Dashboard
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  
  { path: 'requests', component: RequestsComponent, canActivate: [authGuard] },
  { path: 'afficherprofil', component: ProfileViewComponent, canActivate: [authGuard] },
  
  // Admin Only
  { 
    path: 'admin', 
    component: ManageUsers, 
    canActivate: [authGuard], 
    data: { roles: ['ADMIN'] } 
  },

  { path: '**', redirectTo: '/login' }
];
