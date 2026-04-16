import { TranslateModule } from '@ngx-translate/core';
import { Component, signal } from '@angular/core';
import { Auth } from '../../services/auth';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule, CommonModule, TranslateModule, HttpClientModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  stats = signal<any>(null);
  activeTab = signal<'ACTIVE' | 'OPEN' | 'RESOLVED' | null>(null);

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

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
