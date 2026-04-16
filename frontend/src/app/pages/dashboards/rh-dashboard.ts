import { TranslateModule } from '@ngx-translate/core';
import { Component, signal } from '@angular/core';
import { Auth } from '../../services/auth';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-rh-dashboard',
  standalone: true,
  imports: [RouterModule, CommonModule, TranslateModule, HttpClientModule],
  templateUrl: '../dashboard/dashboard.html',
  styleUrl: '../dashboard/dashboard.scss',
})
export class RHDashboard {
  stats = signal<any>(null);
  activeTab = signal<string | null>(null);
  constructor(public auth: Auth, private http: HttpClient) {
    this.loadStats();
  }

  loadStats() {
    this.http.get<any>('http://localhost:8080/api/admin/users/stats').subscribe({
      next: (data) => this.stats.set(data),
      error: (err) => console.error('Erreur chargement stats sur RH dashboard', err)
    });
  }
}
