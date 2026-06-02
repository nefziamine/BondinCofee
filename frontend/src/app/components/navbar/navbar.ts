import { Component, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../services/auth';

import { NotificationService } from '../../services/notification-service';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  showNotifications = signal(false);
  showLangs = signal(false);
  highlightedId = signal<number | null>(null);

  constructor(
    public auth: Auth, 
    public notifService: NotificationService,
    private router: Router
  ) {}

  toggleNotifications() {
    this.showNotifications.update(v => !v);
    this.showLangs.set(false);
  }

  toggleLangs() {
    this.showLangs.update(v => !v);
    this.showNotifications.set(false);
  }

  changeLang(lang: string) {
    this.auth.setLanguage(lang);
    this.showLangs.set(false);
  }

  toggleTheme() {
    this.auth.setDarkMode(!this.auth.isDarkMode());
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
