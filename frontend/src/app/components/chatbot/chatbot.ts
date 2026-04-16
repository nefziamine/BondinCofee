import { Component, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService, Message } from '../../services/chatbot-service';
import { Auth } from '../../services/auth';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'app-chatbot',
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.scss'
})
export class ChatbotComponent implements AfterViewChecked {
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;
  isOpen = signal(false);
  userMessage = '';

  constructor(public chatService: ChatbotService, public auth: Auth) {}

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggle() {
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      this.chatService.loadHistory();
    }
  }

  send() {
    if (!this.userMessage.trim()) return;
    this.chatService.sendMessage(this.userMessage);
    this.userMessage = '';
  }

  getBotName() {
    const role = this.auth.userRole() || 'EMPLOYE';
    switch(role) {
      case 'ADMIN': return 'YES2L - Administration ⚙️';
      case 'RH': return 'YES2L - Assistant RH 📋';
      case 'IT': return 'YES2L - Support IT 🖥️';
      default: return 'YES2L - Assistant Bondin 🧋';
    }
  }

  isAnalystBot() {
    const role = this.auth.userRole();
    return role === 'RH' || role === 'IT';
  }

  suggestReply() {
    const currentMsgs = this.chatService.messages();
    const lastUserMsg = currentMsgs.filter(m => m.role === 'user').pop();
    
    let suggestion = "Basé sur les politiques Bondin, je suggère : 'Nous avons bien reçu votre demande et reviendrons vers vous sous 48h.'";
    
    if (lastUserMsg?.content.toLowerCase().includes("congé")) {
        suggestion = "Suggérer réponse : 'Votre demande de congé pour les dates indiquées est conforme au solde actuel.'";
    }

    this.chatService.messages.update(prev => [...prev, {
        role: 'assistant',
        content: "[PROPOSITION] " + suggestion
    }]);
  }

  private scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }
}
