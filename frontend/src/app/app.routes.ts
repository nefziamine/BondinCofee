import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { ProfileViewComponent } from './profile-view/profile-view';
import { LandingPage } from './pages/landing/landing';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { ChangePassword } from './pages/change-password/change-password';
import { RequestsComponent } from './pages/requests/requests';
import { DashboardHub } from './pages/dashboard-hub/dashboard-hub';
import { authGuard } from './guards/auth-guard';
import { NotePage } from './pages/note/note';

export const routes: Routes = [
  { path: '', component: LandingPage },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'change-password', component: ChangePassword, canActivate: [authGuard] },
  
  // Protected Routes - New unified Dashboard Hub with sidebar
  { path: 'dashboard', component: DashboardHub, canActivate: [authGuard], data: { roles: ['EMPLOYE', 'RH', 'IT', 'ADMIN'] } },
  
  { path: 'requests', component: RequestsComponent, canActivate: [authGuard] },
  { path: 'afficherprofil', component: ProfileViewComponent, canActivate: [authGuard] },
  { path: 'note', component: NotePage, canActivate: [authGuard] },
  


  { path: '**', redirectTo: '/login' }
];
