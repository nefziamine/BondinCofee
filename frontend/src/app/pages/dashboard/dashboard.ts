import { TranslateModule } from '@ngx-translate/core';
import { Component, signal } from '@angular/core';
import { Auth } from '../../services/auth';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RequestsComponent } from '../requests/requests';

export interface DashboardCard {
  icon: string;
  label: string;
  route?: string;
  action?: () => void;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule, CommonModule, TranslateModule, HttpClientModule, RequestsComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  stats = signal<any>(null);
  activeTab = signal<'ACTIVE' | 'OPEN' | 'RESOLVED' | null>(null);
  panelTitle = signal('Panneau de configuration');
  activeView = signal<'QUESTION' | 'RECLAMATION' | 'MESSAGES' | null>(null);

  constructor(
    public auth: Auth, 
    private router: Router,
    private http: HttpClient
  ) {
    if (!this.auth.userRole()) {
       this.router.navigate(['/login']);
    }
    
    const role = this.auth.userRole();
    if (role === 'ADMIN' || role === 'RH' || role === 'IT') {
      this.loadStats();
    }
  }

  loadStats() {
    this.http.get<any>('http://localhost:8080/api/admin/users/stats').subscribe({
      next: (data) => this.stats.set(data),
      error: (err) => console.error('Erreur chargement stats sur dashboard', err)
    });
  }

  get role() {
    return this.auth.userRole() || 'EMPLOYE';
  }

  get coverImage() {
    return 'assets/images/admin-cover.png';
  }

  get roleCards(): DashboardCard[] {
    if (this.role === 'RH') {
      return [
        { icon: '👥', label: 'Dossiers RH', action: () => this.openView('QUESTION') },
        { icon: '💬', label: 'Messagerie', action: () => this.openView('MESSAGES') }
      ];
    }
    if (this.role === 'IT') {
      return [
        { icon: '🖥️', label: 'Tickets IT', action: () => this.openView('QUESTION') },
        { icon: '💬', label: 'Messagerie', action: () => this.openView('MESSAGES') }
      ];
    }
    return [
      { icon: '💬', label: 'Tickets', action: () => this.openView('MESSAGES') },
      { icon: '🤖', label: 'Assistant interne', route: '/requests' }
    ];
  }

  openView(view: 'QUESTION' | 'RECLAMATION' | 'MESSAGES') {
    this.activeView.set(view);
  }

  closeView() {
    this.activeView.set(null);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
