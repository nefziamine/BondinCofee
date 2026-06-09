import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private apiUrl = 'http://localhost:8080/api/auth';
  
  // App State Signals
  userRole = signal<string | null>(null);
  /** When non-null, user is logged in; chatbot uses this to isolate visitor vs employee transcripts. */
  sessionUserId = signal<string | null>(null);
  userProfile = signal<any>(null);
  isDarkMode = signal<boolean>(true);
  currentLang = signal<string>('fr');

  constructor(
    private http: HttpClient, 
    private translate: TranslateService, 
    private router: Router
  ) {
    this.initStatus();
  }

  private initStatus() {
    // Role init
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = this.decodeToken(token);
      this.userRole.set(decoded.role);
      
      // Auto-recover userId if missing from localStorage but present in token
      if (!localStorage.getItem('userId') && decoded.userId) {
        localStorage.setItem('userId', decoded.userId);
      }
      this.sessionUserId.set(localStorage.getItem('userId'));
      this.fetchUserProfile();
    } else {
      this.sessionUserId.set(null);
    }

    // Theme init
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      this.setDarkMode(false);
    } else {
      this.setDarkMode(true);
    }

    // i18n init
    const savedLang = localStorage.getItem('lang') || 'fr';
    this.setLanguage(savedLang);
  }

  login(credentials: any): Observable<any> {
    // Clear any existing session before new attempt
    this.logout();
    
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        if (res.token) {
          localStorage.setItem('token', res.token);
          if (res.userId) {
            localStorage.setItem('userId', res.userId);
          }
          this.fetchUserProfile();
          const decoded = this.decodeToken(res.token);
          this.userRole.set(decoded.role);
          this.sessionUserId.set(localStorage.getItem('userId'));
          
          // All roles now go to the unified dashboard hub
          this.router.navigate(['/dashboard']);
        }
      })
    );
  }

  register(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, data);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    this.userRole.set(null);
    this.sessionUserId.set(null);
    this.userProfile.set(null);
  }

  fetchUserProfile() {
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.http.get(`http://localhost:8080/api/profile/me?userId=${userId}`).subscribe({
        next: (data) => this.userProfile.set(data),
        error: (err) => console.error('Error fetching user profile', err)
      });
    }
  }

  forgotPassword(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/forgot-password`, data);
  }

  resetPassword(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reset-password`, data);
  }

  changePassword(data: { oldPassword: string; newPassword: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/change-password`, data);
  }

  private decodeToken(token: string): { role: string | null, userId: string | null } {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      let role: string | null = decoded.role ? String(decoded.role) : null;
      if (role && role.startsWith('ROLE_')) {
        role = role.replace('ROLE_', '');
      }
      // Normalize common role name variations (backend may return English or French labels)
      role = role ? role.trim().toUpperCase() : null;
      const roleMap: Record<string,string> = {
        'EMPLOYEE': 'EMPLOYE',
        'EMPLOYE': 'EMPLOYE',
        'COLLABORATOR': 'EMPLOYE',
        'RH': 'RH',
        'IT': 'IT',
        'ADMIN': 'ADMIN'
      };
      const normalized = role ? (roleMap[role] || role) : null;

      return {
        role: normalized,
        userId: decoded.userId ? String(decoded.userId) : null
      };
    } catch {
      return { role: null, userId: null };
    }
  }

  getRole() { 
    let role = this.userRole();
    if (role && role.startsWith('ROLE_')) {
      role = role.replace('ROLE_', '');
    }
    role = role ? role.trim().toUpperCase() : null;
    // Ensure same normalization at runtime (in case role was stored differently)
    const roleMap: Record<string,string> = {
      'EMPLOYEE': 'EMPLOYE',
      'EMPLOYE': 'EMPLOYE',
      'COLLABORATOR': 'EMPLOYE',
      'RH': 'RH',
      'IT': 'IT',
      'ADMIN': 'ADMIN'
    };
    return role ? (roleMap[role] || role) : null;
  }

  getUserId() {
    return localStorage.getItem('userId');
  }

  setDarkMode(isDark: boolean) {
    this.isDarkMode.set(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
    }
  }

  setLanguage(lang: string) {
    this.currentLang.set(lang);
    localStorage.setItem('lang', lang);
    this.translate.use(lang);
    
    // Handle RTL and HTML Lang
    const html = document.documentElement;
    html.setAttribute('lang', lang);
    if (lang === 'ar') {
      html.setAttribute('dir', 'rtl');
    } else {
      html.setAttribute('dir', 'ltr');
    }
  }
}
