import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatAskResponse {
  reply: string;
  timestamp: string;
  authenticated: boolean;
}

export interface ChatMessageDto {
  id: number;
  userId: number;
  role: 'USER' | 'BOT';
  content: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private http = inject(HttpClient);
  private readonly base = 'http://localhost:8080/api/chatbot';

  ask(message: string): Observable<ChatAskResponse> {
    return this.http.post<ChatAskResponse>(`${this.base}/ask`, { message }, { headers: this.authHeaders() });
  }

  history(): Observable<ChatMessageDto[]> {
    return this.http.get<ChatMessageDto[]>(`${this.base}/history`, { headers: this.authHeaders() });
  }

  clearHistory(): Observable<void> {
    return this.http.delete<void>(`${this.base}/history`, { headers: this.authHeaders() });
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }
}
