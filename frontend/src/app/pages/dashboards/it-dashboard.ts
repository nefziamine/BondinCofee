import { TranslateModule } from '@ngx-translate/core';
import { Component, signal } from '@angular/core';
import { Auth } from '../../services/auth';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RequestsComponent } from '../requests/requests';
import { DashboardCard } from '../dashboard/dashboard';

@Component({
  selector: 'app-it-dashboard',
  standalone: true,
  imports: [RouterModule, CommonModule, TranslateModule, RequestsComponent],
  templateUrl: '../dashboard/dashboard.html',
  styleUrl: '../dashboard/dashboard.scss',
})
export class ITDashboard {
  stats = signal<any>(null);
  activeTab = signal<string | null>(null);
  panelTitle = signal('Panneau de configuration');
  activeView = signal<'QUESTION' | 'RECLAMATION' | 'MESSAGES' | null>(null);

  constructor(public auth: Auth) {}

  get role() {
    return this.auth.userRole() || 'IT';
  }

  get coverImage() {
    return 'assets/images/admin-cover.png';
  }

  get roleCards(): DashboardCard[] {
    return [
      { icon: '🖥️', label: 'Tickets IT', action: () => this.openView('QUESTION') },
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
