import { Component, OnInit, signal, computed, Input, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Auth } from '../../services/auth';
import { ReclamationService } from '../../services/reclamation-service';
import { Reclamation } from '../../Model/Reclamation';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { MessageService } from '../../services/message-service';
import { NotificationService } from '../../services/notification-service';

export interface Message {
  id?: number;
  senderId: number;
  senderName?: string;
  receiverId?: number | null;
  content: string;
  timestamp?: string;
  broadcast?: boolean;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, HttpClientModule],
  selector: 'app-requests',
  templateUrl: './requests.html',
  styleUrl: './requests.scss'
})
export class RequestsComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatScroll') private chatScrollContainer!: ElementRef;
  @Input() initialTab?: 'QUESTION' | 'RECLAMATION' | 'MESSAGES';
  @Input() hiddenTabs: string[] = [];
  userRole = '';
  reclamations = signal<Reclamation[]>([]);
  messages = signal<Message[]>([]);
  currentTab = signal<'QUESTION' | 'RECLAMATION' | 'MESSAGES'>('QUESTION');
  
  // Chat messaging
  newMessageText = '';
  users = signal<any[]>([]);
  selectedRecipientId = signal<number | 'ALL' | null>(null);
  userPhotos = signal<Map<string, string>>(new Map());
  showMentionList = signal(false);
  mentionQuery = signal('');
  mentionStartIndex = signal<number | null>(null);
  mentionCursorIndex = signal<number | null>(null);
  
  // File upload state
  currentAttachment = signal<{ url: string, name: string, type: string } | null>(null);
  
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

  mentionSuggestions = computed(() => {
    const query = this.mentionQuery().trim().toLowerCase();
    const list = this.users();
    if (!query) return list;
    return list.filter(u =>
      String(u.nomUtilisateur || '').toLowerCase().includes(query)
    );
  });

  recipientOptions = computed(() => {
    const me = this.currentUserId;
    return this.users().filter(u => u.id !== me);
  });

  ngOnInit() {
    this.loadRequests();
    this.loadMessages();
    this.loadPhotos();
    const role = this.auth.userRole();
    
    if (this.initialTab) {
      this.currentTab.set(this.initialTab);
    } else if (role === 'ADMIN') {
      this.currentTab.set('MESSAGES');
    } else if (role === 'RH' || role === 'IT') {
      this.currentTab.set('QUESTION');
    } else {
      this.currentTab.set('QUESTION');
    }
    this.loadUsers();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      if (this.currentTab() === 'MESSAGES' && this.chatScrollContainer) {
        this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
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
      next: (data) => {
        this.users.set(data);
        if (this.auth.userRole() === 'ADMIN') {
          this.selectedRecipientId.set('ALL');
        } else if (!this.selectedRecipientId()) {
          const first = data.find(u => u.id !== this.currentUserId);
          this.selectedRecipientId.set(first?.id ?? null);
        }
      },
      error: (err) => console.error('Error loading users for messaging', err)
    });
  }

  loadMessages() {
    const role = this.auth.userRole();
    const userId = Number(localStorage.getItem('userId'));

    if (role === 'ADMIN') {
      this.messageService.getAllAdminMessages().subscribe((res: any) => this.messages.set(res));
    } else {
      this.messageService.getUserMessages(userId).subscribe((res: any) => this.messages.set(res));
    }
  }

  sendMessageText() {
    if (!this.newMessageText.trim() && !this.currentAttachment()) return;

    const role = this.auth.userRole();
    const userId = Number(localStorage.getItem('userId'));

    if (role !== 'ADMIN' && !this.selectedRecipientId()) {
      alert('Veuillez choisir un destinataire.');
      return;
    }

    const targetReceiver = this.selectedRecipientId() === 'ALL' ? null : Number(this.selectedRecipientId());

    const msg: Message = {
      senderId: userId,
      content: this.newMessageText,
      broadcast: role === 'ADMIN' ? (this.selectedRecipientId() === 'ALL') : false,
      receiverId: targetReceiver,
      attachmentUrl: this.currentAttachment()?.url,
      attachmentName: this.currentAttachment()?.name,
      attachmentType: this.currentAttachment()?.type
    };

    this.messageService.sendMessage(msg).subscribe({
      next: (res: any) => {
        this.messages.update(m => [...m, res]);
        this.newMessageText = '';
        this.currentAttachment.set(null);
        this.hideMentionList();
        const targetName = msg.broadcast ? 'tous' : 'le destinataire choisi';
        this.notifService.addNotification(`Message envoyé à ${targetName}`, '✉️');
      },
      error: (err: any) => console.error('Error sending message', err)
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
    if (this.hiddenTabs.includes(tab)) return;
    this.currentTab.set(tab);
    if (tab !== 'MESSAGES') {
      this.newRequest.type = tab;
    }
  }

  uploadFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          this.currentAttachment.set({
            url: reader.result as string,
            name: file.name,
            type: file.type
          });
          this.notifService.addNotification(`Fichier "${file.name}" attaché`, '📎');
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  downloadFile(msg: Message) {
    if (!msg.attachmentUrl) return;
    const link = document.createElement('a');
    link.href = msg.attachmentUrl;
    link.download = msg.attachmentName || 'download';
    link.click();
  }

  submitRequest() {
    if (!this.newRequest.sujet || !this.newRequest.description) return;
    if (!this.newRequest.category) {
      alert('Veuillez choisir un destinataire (RH ou IT).');
      return;
    }
    
    this.newRequest.userId = Number(localStorage.getItem('userId'));
    this.recService.add(this.newRequest).subscribe({
      next: () => {
        const typeLabel = this.newRequest.type === 'QUESTION' ? 'Question' : 'Réclamation';
        this.notifService.addNotification(`${typeLabel} soumise avec succès`, '📝');
        this.loadRequests();
        this.newRequest = {
          sujet: '',
          description: '',
          status: 'Pending',
          type: (this.currentTab() === 'MESSAGES' ? 'QUESTION' : this.currentTab()) as 'QUESTION' | 'RECLAMATION',
          category: this.newRequest.category
        };
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
    this.showAnswerForm.set(r.id || null);
    this.isAiLoading.set(r.id || null);
    this.currentResponse = 'Assistant interne en préparation de réponse...';

    setTimeout(() => {
      this.currentResponse = this.generateInternalAiReply(r);
      this.isAiLoading.set(null);
    }, 550);
  }
  get currentUserId(): number {
    return Number(localStorage.getItem('userId'));
  }

  onMessageInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.newMessageText = target.value;
    this.updateMentionState(target.value, target.selectionStart ?? target.value.length);
  }

  onMessageCaretChange(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.updateMentionState(this.newMessageText, target.selectionStart ?? this.newMessageText.length);
  }

  selectMention(user: any) {
    const start = this.mentionStartIndex();
    const cursor = this.mentionCursorIndex();
    if (start === null || cursor === null) return;
    const name = String(user.nomUtilisateur || '').trim();
    if (!name) return;
    const before = this.newMessageText.slice(0, start);
    const after = this.newMessageText.slice(cursor);
    this.newMessageText = `${before}@${name} ${after}`;
    this.hideMentionList();
  }

  private updateMentionState(value: string, cursorIndex: number) {
    this.mentionCursorIndex.set(cursorIndex);
    const atIndex = value.lastIndexOf('@', cursorIndex - 1);
    if (atIndex < 0) {
      this.hideMentionList();
      return;
    }

    const between = value.slice(atIndex + 1, cursorIndex);
    const hasSpace = /\s/.test(between);
    if (hasSpace) {
      this.hideMentionList();
      return;
    }

    this.mentionStartIndex.set(atIndex);
    this.mentionQuery.set(between);
    this.showMentionList.set(true);
  }

  private hideMentionList() {
    this.showMentionList.set(false);
    this.mentionQuery.set('');
    this.mentionStartIndex.set(null);
    this.mentionCursorIndex.set(null);
  }

  private generateInternalAiReply(r: Reclamation): string {
    const text = `${r.sujet || ''} ${r.description || ''}`.toLowerCase();
    const isRh = (r.category || '').toUpperCase() === 'RH';
    const isIt = (r.category || '').toUpperCase() === 'IT';

    const hasAny = (arr: string[]) => arr.some(k => text.includes(k));

    if (isIt) {
      if (hasAny(['vpn', 'distance', 'remote'])) {
        return `**Plan IT - VPN**\n- Vérifier identifiants et statut du compte.\n- Redémarrer client VPN et poste.\n- Tester connexion via partage 4G.\n- Si échec, ouvrir ticket IT avec capture d'écran.\n\n**Escalade**: équipe réseau si impact global.`;
      }
      if (hasAny(['wifi', 'internet', 'réseau', 'reseau'])) {
        return `**Plan IT - Connectivité**\n- Vérifier câble/borne et redémarrer routeur local.\n- Exécuter test ping interne puis externe.\n- Contrôler IP/DNS automatiques.\n- Basculer temporairement sur réseau secours.\n\n**Escalade**: support infra si panne persistante.`;
      }
      if (hasAny(['mot de passe', 'password', 'compte', 'login'])) {
        return `**Plan IT - Accès compte**\n- Forcer réinitialisation du mot de passe.\n- Vérifier verrouillage du compte.\n- Contrôler rôle et droits applicatifs.\n- Demander reconnexion puis test fonctionnel.\n\n**Escalade**: sécurité SI si activité suspecte.`;
      }
      if (hasAny(['imprimante', 'printer', 'scan'])) {
        return `**Plan IT - Impression**\n- Vérifier file d'impression et redémarrer spooler.\n- Tester imprimante sur un autre poste.\n- Réinstaller pilote recommandé.\n- Valider réseau local de l'équipement.\n\n**Escalade**: maintenance matériel si panne physique.`;
      }
      return `**Plan IT standard**\n- Reproduire le problème avec l'utilisateur.\n- Vérifier poste, session, réseau et droits.\n- Appliquer correctif puis revalider le scénario.\n- Documenter cause racine et action préventive.`;
    }

    if (isRh) {
      if (hasAny(['congé', 'vacance', 'absence'])) {
        return `**Réponse RH - Congé**\n- Vérifier solde et période demandée.\n- Contrôler contraintes de service.\n- Proposer validation ou ajustement de dates.\n- Notifier décision au collaborateur sous 48h.`;
      }
      if (hasAny(['paie', 'salaire', 'prime'])) {
        return `**Réponse RH - Paie**\n- Vérifier variables paie du mois.\n- Contrôler prime/retard/absence.\n- Corriger si écart confirmé.\n- Informer le collaborateur du détail de calcul.`;
      }
      if (hasAny(['attestation', 'certificat', 'emploi'])) {
        return `**Réponse RH - Attestation**\n- Valider identité et type d'attestation.\n- Générer document signé.\n- Envoyer en PDF + dépôt RH.\n- Délai cible: 24 à 48h ouvrées.`;
      }
      if (hasAny(['harcèlement', 'harcelement', 'conflit'])) {
        return `**Réponse RH - Situation sensible**\n- Accuser réception de manière confidentielle.\n- Planifier entretien séparé avec les parties.\n- Appliquer protocole RH et traçabilité.\n- Escalader à la direction RH si nécessaire.`;
      }
      return `**Réponse RH standard**\n- Vérifier dossier collaborateur.\n- Confirmer politique interne applicable.\n- Donner une réponse claire + délai.\n- Prévoir suivi et clôture officielle.`;
    }

    return `**Assistant interne**\n- Catégorie non précisée.\n- Merci de choisir un destinataire RH ou IT pour une réponse ciblée.\n- En attendant, traiter selon procédure standard et tracer les actions.`;
  }
}
