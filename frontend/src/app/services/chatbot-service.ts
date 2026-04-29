import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private apiUrl = 'http://localhost:8080/api/chatbot';

  constructor(private http: HttpClient) {}

  ask(message: string, userId: number, role: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/ask`, { message, userId, role });
  }

  getHistory(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/history/${userId}`);
  }

  // Compatibility methods for existing components
  loadHistory() {
    console.log('Chat history cleared/reloaded');
  }

  messages = () => []; // Dummy for compatibility if needed
}
