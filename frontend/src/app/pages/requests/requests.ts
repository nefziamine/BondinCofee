import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Auth } from '../../services/auth';
import { ReclamationService } from '../../services/reclamation-service';
import { Reclamation } from '../../Model/Reclamation';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { MessageService, Message } from '../../services/message-service';
import { NotificationService } from '../../services/notification-service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, HttpClientModule],
  selector: 'app-requests',
  templateUrl: './requests.html',
  styleUrl: './requests.scss'
})
export class RequestsComponent implements OnInit {
  userRole = '';
  reclamations = signal<Reclamation[]>([]);
  messages = signal<Message[]>([]);
  currentTab = signal<'QUESTION' | 'RECLAMATION' | 'MESSAGES'>('QUESTION');
  
  // Chat messaging
  newMessageText = '';
  users = signal<any[]>([]);
  selectedRecipientId = signal<number | 'ALL'>('ALL');
  userPhotos = signal<Map<string, string>>(new Map());
  
  // Form State
  newRequest: Reclamation = {
    sujet: '',
    description: '',
    status: 'Pending',
    type: 'QUESTION'
  };

  showAnswerForm = signal<number | null>(null);
  currentResponse = '';
  isAiLoading = signal<number | null>(null);

  constructor(
    public auth: Auth, 
    private recService: ReclamationService,
    private messageService: MessageService,
    private http: HttpClient,
    private notifService: NotificationService
  ) {
    this.userRole = this.auth.getRole() || 'EMPLOYE';
  }

  ngOnInit() {
    this.loadRequests();
    this.loadMessages();
    this.loadPhotos();
    const role = this.auth.userRole();
    
    if (role === 'ADMIN') {
      this.currentTab.set('MESSAGES');
      this.loadUsers();
    } else if (role === 'RH' || role === 'IT') {
      this.currentTab.set('QUESTION');
      this.loadUsers();
    } else {
      this.currentTab.set('QUESTION');
    }
  }

  loadPhotos() {
    this.http.get<any[]>('http://localhost:8080/api/profile/all').subscribe({
      next: (data) => {
        const pm = new Map<string, string>();
        data.forEach(p => {
            if (p.email && p.imageurl) {
                pm.set(p.email.toLowerCase().trim(), p.imageurl);
            }
        });
        this.userPhotos.set(pm);
      },
      error: (err) => console.error('Error loading profiles', err)
    });
  }

  loadUsers() {
    this.http.get<any[]>('http://localhost:8080/api/admin/users').subscribe({
      next: (data) => this.users.set(data.filter(u => u.role !== 'ADMIN')),
      error: (err) => console.error('Error loading users for messaging', err)
    });
  }

  loadMessages() {
    const role = this.auth.userRole();
    const userId = Number(localStorage.getItem('userId'));

    if (role === 'ADMIN') {
      this.messageService.getAllAdminMessages().subscribe(res => this.messages.set(res));
    } else {
      this.messageService.getUserMessages(userId).subscribe(res => this.messages.set(res));
    }
  }

  sendMessageText() {
    if (!this.newMessageText.trim()) return;

    const role = this.auth.userRole();
    const userId = Number(localStorage.getItem('userId'));

    // Improved logic: If user is employee, reply to the specific admin who last messaged them privately
    let targetReceiver: number | null = 1; 
    if (role !== 'ADMIN') {
      const lastPrivateMsg = [...this.messages()].reverse().find(m => !m.broadcast && m.senderId !== userId);
      if (lastPrivateMsg && lastPrivateMsg.senderId) {
        targetReceiver = lastPrivateMsg.senderId;
      }
    } else {
      targetReceiver = this.selectedRecipientId() === 'ALL' ? null : Number(this.selectedRecipientId());
    }

    const msg: Message = {
      senderId: userId,
      content: this.newMessageText,
      broadcast: role === 'ADMIN' ? (this.selectedRecipientId() === 'ALL') : false,
      receiverId: targetReceiver
    };

    this.messageService.sendMessage(msg).subscribe({
      next: (res) => {
        this.messages.update(m => [...m, res]);
        this.newMessageText = '';
        const targetName = msg.broadcast ? 'tous' : (role === 'ADMIN' ? 'le collaborateur' : 'l\'administrateur');
        this.notifService.addNotification(`Message envoyé à ${targetName}`, '✉️');
      },
      error: (err) => console.error('Error sending message', err)
    });
  }

  loadRequests() {
    const role = this.auth.userRole();
    const userId = Number(localStorage.getItem('userId'));

    if (role === 'ADMIN') {
      this.recService.getAll().subscribe(res => this.reclamations.set(res));
    } else if (role === 'RH') {
      this.recService.getByCategory('RH').subscribe(res => this.reclamations.set(res));
    } else if (role === 'IT') {
      this.recService.getByCategory('IT').subscribe(res => this.reclamations.set(res));
    } else {
      this.recService.getByUserId(userId).subscribe(res => this.reclamations.set(res));
    }
  }

  filteredRequests() {
    return this.reclamations().filter(r => r.type === this.currentTab());
  }

  setTab(tab: 'QUESTION' | 'RECLAMATION' | 'MESSAGES') {
    this.currentTab.set(tab);
    if (tab !== 'MESSAGES') {
      this.newRequest.type = tab;
    }
  }

  submitRequest() {
    if (!this.newRequest.sujet || !this.newRequest.description) return;
    
    this.newRequest.userId = Number(localStorage.getItem('userId'));
    this.recService.add(this.newRequest).subscribe({
      next: () => {
        const typeLabel = this.newRequest.type === 'QUESTION' ? 'Question' : 'Réclamation';
        this.notifService.addNotification(`${typeLabel} soumise avec succès`, '📝');
        this.loadRequests();
        this.newRequest = { sujet: '', description: '', status: 'Pending', type: (this.currentTab() === 'MESSAGES' ? 'QUESTION' : this.currentTab()) as 'QUESTION' | 'RECLAMATION' };
      },
      error: (err) => console.error('Error submitting request', err)
    });
  }

  updateStatus(id: number | undefined, status: string) {
    if (!id) return;
    const req = this.reclamations().find(r => r.id === id);
    if (!req) return;
    
    const updated = { ...req, status };
    this.recService.update(id, updated).subscribe(() => this.loadRequests());
  }

  sendResponse(id: number | undefined) {
    if (!id || !this.currentResponse) return;
    
    this.recService.answer(id, this.currentResponse).subscribe({
      next: () => {
        this.notifService.addNotification('Réponse envoyée au collaborateur', '✅');
        this.loadRequests();
        this.showAnswerForm.set(null);
        this.currentResponse = '';
      },
      error: (err) => console.error('Error answering request', err)
    });
  }

  askAI(r: Reclamation) {
    const prompt = `Vous êtes un expert HR & IT pour la Maison Bondin. 
    Un employé a soumis une ${r.type} sur le sujet "${r.sujet}" : "${r.description}".
    
    CONSIGNES DE RÉPONSE :
    1. Utilisez un langage simple et clair (pas de jargon inutile).
    2. Structurez la réponse avec des points (bullet points) si nécessaire.
    3. Utilisez le formatage gras pour les points clés.
    4. Soyez professionnel mais très accessible.
    5. Fournissez une solution concrète et rapide.`;

    const payload = {
      role: this.auth.userRole() || 'RH',
      history: [],
      message: prompt
    };

    this.showAnswerForm.set(r.id || null);
    this.isAiLoading.set(r.id || null);
    this.currentResponse = 'L\'IA réfléchit...';

    // Directly calling the chat API
    const chatUrl = 'http://localhost:8080/api/chat';
    this.http.post<{reply: string}>(chatUrl, payload).subscribe({
      next: (res: {reply: string}) => {
        this.currentResponse = res.reply;
        this.isAiLoading.set(null);
      },
      error: () => {
        this.currentResponse = 'Désolé, l\'IA n\'a pas pu répondre à ce moment.';
        this.isAiLoading.set(null);
      }
    });
  }
  get currentUserId(): number {
    return Number(localStorage.getItem('userId'));
  }
}
