import { TranslateModule } from '@ngx-translate/core';
import { Component, signal } from '@angular/core';
import { Auth } from '../../services/auth';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RequestsComponent } from '../requests/requests';
import { DashboardCard } from '../dashboard/dashboard';

@Component({
  selector: 'app-rh-dashboard',
  standalone: true,
  imports: [RouterModule, CommonModule, TranslateModule, HttpClientModule, RequestsComponent],
  templateUrl: '../dashboard/dashboard.html',
  styleUrl: '../dashboard/dashboard.scss',
})
export class RHDashboard {
  stats = signal<any>(null);
  activeTab = signal<string | null>(null);
  panelTitle = signal('Panneau de configuration');
  activeView = signal<'QUESTION' | 'RECLAMATION' | 'MESSAGES' | null>(null);

  constructor(public auth: Auth, private http: HttpClient) {
    this.loadStats();
  }

  loadStats() {
    this.http.get<any>('http://localhost:8080/api/admin/users/stats').subscribe({
      next: (data) => this.stats.set(data),
      error: (err) => console.error('Erreur chargement stats sur RH dashboard', err)
    });
  }

  get role() {
    return this.auth.userRole() || 'RH';
  }

  get coverImage() {
    return 'assets/images/admin-cover.png';
  }

  get roleCards(): DashboardCard[] {
    return [
      { icon: '👥', label: 'Dossiers RH', action: () => this.openView('QUESTION') },
      { icon: '💬', label: 'Messagerie', action: () => this.openView('MESSAGES') }
    ];
  }

  openView(view: 'QUESTION' | 'RECLAMATION' | 'MESSAGES') {
    this.activeView.set(view);
  }

  closeView() {
    this.activeView.set(null);
  }
}
