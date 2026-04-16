// src/app/profile/profile.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
export interface ProfilUser {
  id?: number;
  userId?: number;
  nomComplet: string;
  email: string;
  department: string;
  poste: string;
  telephone: string;
  experience: string;
  imageurl?: string; // correspond à ton champ imageurl en Java
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  private API_URL = 'http://localhost:8080/api/profile';

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token || ''}`
    });
  }

  getProfile(userId: number): Observable<ProfilUser> {
    return this.http.get<ProfilUser>(`${this.API_URL}/me?userId=${userId}`, { headers: this.getAuthHeaders() });
  }

  saveProfile(profile: ProfilUser): Observable<ProfilUser> {
    return this.http.post<ProfilUser>(`${this.API_URL}/save`, profile, { headers: this.getAuthHeaders() });
  }

  uploadImage(file: File, userId: number): Observable<{url: string}> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{url: string}>(`${this.API_URL}/upload-image?userId=${userId}`, formData, { headers: this.getAuthHeaders() });
  }
}