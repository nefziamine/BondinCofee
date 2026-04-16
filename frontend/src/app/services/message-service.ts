import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Message {
  id?: number;
  senderId?: number;
  receiverId?: number | null;
  content: string;
  timestamp?: string;
  senderName?: string;
  broadcast?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apiUrl = 'http://localhost:8080/api/messages';

  constructor(private http: HttpClient) {}

  getUserMessages(userId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/user/${userId}`);
  }

  getAllAdminMessages(): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/admin`);
  }

  sendMessage(msg: Message): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/send`, msg);
  }
}
