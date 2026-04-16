import { TranslateModule } from '@ngx-translate/core';
import { Component, signal } from '@angular/core';
import { Auth } from '../../services/auth';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-emp-dashboard',
  standalone: true,
  imports: [RouterModule, CommonModule, TranslateModule],
  templateUrl: '../dashboard/dashboard.html',
  styleUrl: '../dashboard/dashboard.scss',
})
export class EmpDashboard {
  stats = signal<any>(null);
  activeTab = signal<string | null>(null);
  constructor(public auth: Auth) {}
}
