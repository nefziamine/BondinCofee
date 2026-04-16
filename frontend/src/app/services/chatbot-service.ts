import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Auth } from './auth';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private apiUrl = 'http://localhost:8080/api/chat';
  messages = signal<Message[]>([]);
  isTyping = signal(false);

  constructor(private http: HttpClient, private auth: Auth) {
    this.loadHistory();
  }

  private getUserId(): string {
    const realId = localStorage.getItem('userId');
    if (realId) return realId;
    
    let guestId = localStorage.getItem('bondin_guest_id');
    if (!guestId) {
      guestId = 'GUEST_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('bondin_guest_id', guestId);
    }
    return guestId;
  }

  loadHistory() {
    const userId = this.getUserId();
    this.http.get<any[]>(`${this.apiUrl}/history/${userId}`).subscribe({
      next: (data) => {
        const msgs: Message[] = [];
        data.forEach(h => {
          msgs.push({ role: 'user', content: h.userMessage });
          msgs.push({ role: 'assistant', content: h.aiResponse });
        });
        this.messages.set(msgs);
      },
      error: (err) => console.error('Error loading history', err)
    });
  }

  sendMessage(text: string) {
    const userMsg: Message = { role: 'user', content: text };
    this.messages.update(prev => [...prev, userMsg]);
    this.isTyping.set(true);

    const payload = {
      role: this.auth.userRole() || 'GUEST',
      userId: this.getUserId(),
      message: text
    };

    this.http.post<any>(this.apiUrl, payload).subscribe({
      next: (res) => {
        const botMsg: Message = { role: 'assistant', content: res.reply };
        this.messages.update(prev => [...prev, botMsg]);
        this.isTyping.set(false);
      },
      error: () => {
        const errorMsg: Message = { role: 'assistant', content: "Désolé, le service IA Maison Bondin est temporairement indisponible." };
        this.messages.update(prev => [...prev, errorMsg]);
        this.isTyping.set(false);
      }
    });
  }

  clear() {
    this.messages.set([]);
  }
}
