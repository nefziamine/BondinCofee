import { TranslateModule } from '@ngx-translate/core';
import { Component, signal } from '@angular/core';
import { Auth } from '../../services/auth';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-it-dashboard',
  standalone: true,
  imports: [RouterModule, CommonModule, TranslateModule],
  templateUrl: '../dashboard/dashboard.html',
  styleUrl: '../dashboard/dashboard.scss',
})
export class ITDashboard {
  stats = signal<any>(null);
  activeTab = signal<string | null>(null);
  constructor(public auth: Auth) {}
}
