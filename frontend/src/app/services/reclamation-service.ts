import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Reclamation } from '../Model/Reclamation';

@Injectable({
  providedIn: 'root',
})
export class ReclamationService {
   private apiUrl = "http://localhost:8080/reclamation";

  constructor(private http: HttpClient) {}

  getAll(): Observable<Reclamation[]> {
    return this.http.get<Reclamation[]>(`${this.apiUrl}/all`);
  }

  add(reclamation: Reclamation): Observable<Reclamation> {
    return this.http.post<Reclamation>(`${this.apiUrl}/add`, reclamation);
  }

  update(id: number, reclamation: Reclamation): Observable<Reclamation> {
    return this.http.put<Reclamation>(`${this.apiUrl}/update/${id}`, reclamation);
  }

  delete(id: number) {
    return this.http.delete(`${this.apiUrl}/delete/${id}`);
  }

  getByCategory(category: string): Observable<Reclamation[]> {
    return this.http.get<Reclamation[]>(`${this.apiUrl}/category/${category}`);
  }

  answer(id: number, reponse: string): Observable<Reclamation> {
    return this.http.post<Reclamation>(`${this.apiUrl}/answer/${id}`, reponse, {
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  getByUserId(userId: number): Observable<Reclamation[]> {
    return this.http.get<Reclamation[]>(`${this.apiUrl}/user/${userId}`);
  }
  
}
