import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from '../../services/chatbot-service';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chatbot-wrapper" [class.open]="isOpen()">
      <!-- Chat Toggle Button -->
      <button class="chatbot-toggle shadow-premium" (click)="toggleChat()">
        <span class="icon" *ngIf="!isOpen()">🤖</span>
        <span class="icon" *ngIf="isOpen()">×</span>
      </button>

      <!-- Chat Window -->
      <div class="chat-window shadow-premium animate-fade" *ngIf="isOpen()">
        <div class="chat-header">
          <div class="bot-info">
            <span class="bot-avatar">🤖</span>
            <div>
              <h4>Assistant Bondin</h4>
              <p>En ligne | Local Mode</p>
            </div>
          </div>
        </div>

        <div class="chat-history" #scrollMe [scrollTop]="$any(scrollMe).scrollHeight">
          <div *ngFor="let msg of messages()" class="message" [class.user-msg]="msg.isUser" [class.bot-msg]="!msg.isUser">
            <div class="bubble">
              {{ msg.text }}
            </div>
          </div>
          
          <div *ngIf="loading()" class="message bot-msg">
            <div class="bubble typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <div class="chat-input">
          <input type="text" [(ngModel)]="currentMessage" (keyup.enter)="sendMessage()" placeholder="Posez votre question (Derja supportée)...">
          <button (click)="sendMessage()" [disabled]="!currentMessage.trim()">
            <span class="send-icon">➡️</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chatbot-wrapper { position: fixed; bottom: 2rem; right: 2rem; z-index: 1000; font-family: var(--font-body); }
    
    .chatbot-toggle {
      width: 60px; height: 60px; border-radius: 50%; background: var(--red); border: none;
      color: white; font-size: 1.5rem; cursor: pointer; transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      display: flex; align-items: center; justify-content: center;
    }
    .chatbot-toggle:hover { transform: scale(1.1) rotate(5deg); box-shadow: 0 10px 20px rgba(192, 40, 31, 0.4); }

    .chat-window {
      position: absolute; bottom: 80px; right: 0; width: 380px; height: 500px;
      background: var(--surface); border: 1px solid var(--border); border-radius: 20px;
      display: flex; flex-direction: column; overflow: hidden;
    }

    .chat-header {
      padding: 1.2rem; background: rgba(255,255,255,0.03); border-bottom: 1px solid var(--border);
    }
    .chat-header .bot-info { display: flex; align-items: center; gap: 1rem; }
    .chat-header .bot-avatar { width: 40px; height: 40px; background: var(--gold); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
    .chat-header h4 { margin: 0; font-family: var(--font-display); font-style: italic; color: var(--gold); }
    .chat-header p { margin: 0; font-size: 0.7rem; color: #4caf50; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }

    .chat-history {
      flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;
      background: radial-gradient(circle at top right, rgba(184, 136, 42, 0.05), transparent 300px);
    }

    .message { display: flex; }
    .message.user-msg { justify-content: flex-end; }
    .bubble { 
      padding: 0.8rem 1.2rem; border-radius: 18px; font-size: 0.9rem; line-height: 1.4; max-width: 85%;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .bot-msg .bubble { background: var(--surface-secondary); color: var(--text); border-bottom-left-radius: 4px; border: 1px solid var(--border); }
    .user-msg .bubble { background: var(--gold); color: #000; border-bottom-right-radius: 4px; font-weight: 500; }

    .chat-input {
      padding: 1.2rem; background: rgba(0,0,0,0.1); border-top: 1px solid var(--border); display: flex; gap: 0.8rem;
    }
    .chat-input input { flex: 1; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 0.8rem 1.2rem; border-radius: 12px; font-size: 0.9rem; }
    .chat-input input:focus { border-color: var(--gold); outline: none; }
    .chat-input button { background: var(--red); color: white; border: none; width: 45px; height: 45px; border-radius: 12px; cursor: pointer; transition: 0.2s; }
    .chat-input button:hover { transform: scale(1.05); }
    .chat-input button:disabled { opacity: 0.5; }

    .typing-indicator {
      display: flex; gap: 4px; padding: 0.8rem 1.2rem !important;
    }
    .typing-indicator span { width: 6px; height: 6px; background: var(--gold); border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; }
    .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
    .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

    @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }
  `]
})
export class ChatbotComponent {
  isOpen = signal(false);
  loading = signal(false);
  currentMessage = '';
  messages = signal<{text: string, isUser: boolean}[]>([]);

  constructor(private chatbotService: ChatbotService, private auth: Auth) {
    this.loadChatHistory();
  }

  loadChatHistory() {
    const userId = Number(localStorage.getItem('userId'));
    if (!userId) return;
    
    this.chatbotService.getHistory(userId).subscribe({
      next: (history) => {
        if (history.length === 0) {
          const role = this.auth.userRole() || 'EMPLOYE';
          let welcome = "Bonjour ! Je suis l'assistant intelligent de la Maison Bondin. Comment puis-je vous aider ?";
          
          if (role === 'ADMIN') welcome = "Bonjour Monsieur l'Administrateur. Je suis prêt à vous fournir les statistiques et rapports de la Maison Bondin.";
          if (role === 'IT') welcome = "Support IT Bondin à votre service. Prêt à monitorer les tickets techniques.";
          if (role === 'RH') welcome = "Bonjour. Assistant RH à votre écoute pour la gestion des talents et des requêtes.";

          this.messages.set([{ text: welcome, isUser: false }]);
        } else {
          const formatted = history.map(h => ({
            text: h.text,
            isUser: h.isUser
          }));
          this.messages.set(formatted);
        }
      },
      error: (err) => console.error('Error loading history', err)
    });
  }

  toggleChat() {
    const wasOpen = this.isOpen();
    this.isOpen.set(!wasOpen);
    if (!wasOpen) {
      this.loadChatHistory();
    }
  }

  sendMessage() {
    if (!this.currentMessage.trim()) return;

    const userMsg = this.currentMessage;
    this.messages.update(m => [...m, { text: userMsg, isUser: true }]);
    this.currentMessage = '';
    this.loading.set(true);

    const userId = Number(localStorage.getItem('userId'));
    const role = this.auth.userRole() || 'EMPLOYE';

    this.chatbotService.ask(userMsg, userId, role).subscribe({
      next: (res) => {
        setTimeout(() => {
          this.messages.update(m => [...m, { text: res.response, isUser: false }]);
          this.loading.set(false);
        }, 600);
      },
      error: () => {
        this.messages.update(m => [...m, { text: "Erreur de connexion avec l'assistant.", isUser: false }]);
        this.loading.set(false);
      }
    });
  }
}
