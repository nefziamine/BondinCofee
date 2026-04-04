import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Auth {
 private apiUrl = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient) {}

  login(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, data)
      .pipe(
        tap(response => {
          if (response.token) {
            localStorage.setItem('token', response.token);
          }
          if (response.role) {
            localStorage.setItem('userRole', response.role);
          }
          // Mocking userId if not provided by backend yet
          localStorage.setItem('userId', '1');
        })
      );
  }

  getRole(): string | null {
    return localStorage.getItem('userRole');
  }

  register(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, data);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
   saveToken(token: string) {
    localStorage.setItem('token', token);
  }
  forgotPassword(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/forgot-password`, data);
  }

  resetPassword(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reset-password`, data);
  }
}
