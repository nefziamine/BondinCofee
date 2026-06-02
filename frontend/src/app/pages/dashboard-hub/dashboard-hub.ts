import { Component, signal, computed, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { Auth } from '../../services/auth';
import { NotificationService } from '../../services/notification-service';
import { RequestsComponent } from '../requests/requests';

interface PointageRecord {
  id: number; date: string; clockIn: string | null; clockOut: string | null;
  status: 'present' | 'retard' | 'absent'; userName: string; userId: number; confirmed: boolean;
}
interface LeaveRequest {
  id: number; userId: number; userName: string; startDate: string; endDate: string;
  type: string; reason: string; status: 'pending' | 'approved' | 'rejected';
}
interface DocRequest {
  id: number; userId: number; userName: string; type: string; note: string;
  destinataire: string; date: string; status: 'pending' | 'approved' | 'rejected';
  /** Nom du destinataire de la remise (saisi par le RH à la validation) */
  receiverName?: string;
  /** Signature RH (data URL PNG) */
  rhSignatureDataUrl?: string;
  /** Date de validation RH */
  approvedAt?: string;
}
interface RhDoc {
  icon: string; title: string; summary: string; content: string;
}
interface CalDay {
  date: number; isToday: boolean; isHoliday: boolean; isWeekend: boolean;
  otherMonth: boolean; isLeave: boolean; tooltip: string;
}

type ViewType = 'overview' | 'calendar' | 'pointage' | 'leave' | 'documents' | 'received-docs' | 'messages' | 'tickets'
  | 'rh-docs' | 'rh-pointage' | 'rh-leave' | 'rh-doc-requests' | 'admin-users';

@Component({
  selector: 'app-dashboard-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, HttpClientModule, RequestsComponent],
  templateUrl: './dashboard-hub.html',
  styleUrl: './dashboard-hub.scss'
})
export class DashboardHub implements OnInit, OnDestroy {
  // Sidebar
  sidebarCollapsed = signal(false);
  mobileMenuOpen = signal(false);
  activeView = signal<ViewType>('overview');

  // Calendar
  calMonth = signal(new Date().getMonth());
  calYear = signal(new Date().getFullYear());
  monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  dayNames = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

  // Pointage
  currentTime = signal('00:00:00');
  currentDateStr = signal('');
  /** True only inside the daily pointage window (08:00 → 20:00 local). */
  pointageOpen = signal(false);
  /** Human-readable banner when the window is closed. */
  pointageClosedMessage = signal('');
  /** Working-hours window — single source of truth. */
  static readonly POINTAGE_START_HOUR = 8;
  static readonly POINTAGE_END_HOUR   = 20;
  private clockInterval: any;

  // Leave
  leaveBalance = signal(30);
  newLeave = { startDate: '', endDate: '', type: 'annual', reason: '' };
  private _myLeaves = signal<LeaveRequest[]>([]);
  private _allLeaves = signal<LeaveRequest[]>([]);

  // Document request
  newDocRequest = { type: 'attestation_travail', note: '', destinataire: '' };
  private _myDocRequests = signal<DocRequest[]>([]);
  private _allDocRequests = signal<DocRequest[]>([]);
  private _allUsers = signal<any[]>([]);

  // RH — validation document (signature + destinataire)
  docCompletionOpen = signal(false);
  docBeingCompleted = signal<DocRequest | null>(null);
  completionReceiverName = '';
  signatureTouched = false;
  private sigDrawing = false;
  private sigLast = { x: 0, y: 0 };
  @ViewChild('docSigCanvas') docSigCanvas?: ElementRef<HTMLCanvasElement>;

  // Pointage data
  private _pointageHistory = signal<PointageRecord[]>([]);
  private _allPointages = signal<PointageRecord[]>([]);

  // RH docs
  selectedDoc = signal<RhDoc | null>(null);

  // Stats for Admin (moved from ManageUsers)
  stats = signal<any>({});
  selectedFaq = signal<string | null>(null);
  selectedFaqTickets = signal<any[]>([]);
  coverImage = signal('assets/cover.jpg');
  showAvgResponseDetails = signal(false);
  showAvgResponseSection = signal(false);

  // User Management (Integrated from ManageUsers)
  users = signal<any[]>([]);
  roleFilter = signal('ALL');
  adminSearchQuery = signal('');
  showForm = signal(false);
  showEditForm = signal(false);
  newUser = { nomUtilisateur: '', email: '', password: '', role: 'EMPLOYE' };
  editUserDraft = { id: 0, nomUtilisateur: '', email: '', role: 'EMPLOYE' };

  filteredUsers = computed(() => {
    let list = this.users();
    const query = this.adminSearchQuery().toLowerCase();
    const role = this.roleFilter();
    if (query) {
      list = list.filter(u => 
        (u.nomUtilisateur && u.nomUtilisateur.toLowerCase().includes(query)) || 
        (u.email && u.email.toLowerCase().includes(query))
      );
    }
    if (role !== 'ALL') list = list.filter(u => u.role === role);
    return list;
  });

  // Chart — computed from real pointage data
  chartLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  /** Get Monday of the current week */
  private getWeekStart(): Date {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(diff);
    return monday;
  }

  /** Aggregate pointage records into per-weekday counts */
  private computeWeeklyData = computed(() => {
    const source = (this.role === 'RH' || this.role === 'ADMIN')
      ? this._allPointages()
      : this._pointageHistory();
    const weekStart = this.getWeekStart();
    const presences = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
    const issues = [0, 0, 0, 0, 0, 0, 0];     // retard + absent

    for (const p of source) {
      const d = new Date(p.date);
      if (d >= weekStart) {
        let dayIdx = d.getDay() - 1; // 0=Mon
        if (dayIdx < 0) dayIdx = 6;  // Sunday → 6
        if (dayIdx < 7) {
          if (p.status === 'present') presences[dayIdx]++;
          else issues[dayIdx]++; // retard or absent
        }
      }
    }
    return { presences, issues };
  });

  get chartData1(): number[] { return this.computeWeeklyData().presences; }
  get chartData2(): number[] { return this.computeWeeklyData().issues; }

  rhDocs: RhDoc[] = [
    { icon: '📋', title: 'Politique de Congés', summary: 'Règles d\'attribution et gestion des congés annuels et exceptionnels.',
      content: '<h4>1. Congé Annuel</h4><ul><li>Chaque collaborateur bénéficie de 30 jours ouvrables de congé par an.</li><li>Les congés doivent être demandés au minimum 7 jours à l\'avance.</li><li>Le solde non consommé peut être reporté jusqu\'au 31 mars de l\'année suivante.</li></ul><h4>2. Congé Maladie</h4><ul><li>Justificatif médical requis au-delà de 2 jours.</li><li>Notification au responsable RH dans les 24h.</li></ul><h4>3. Congés Exceptionnels</h4><ul><li>Mariage: 3 jours</li><li>Naissance: 3 jours</li><li>Décès (famille proche): 3 jours</li><li>Déménagement: 1 jour</li></ul>' },
    { icon: '💰', title: 'Politique Salariale', summary: 'Grilles de salaire, primes et avantages sociaux.',
      content: '<h4>1. Rémunération</h4><ul><li>Le salaire est versé entre le 25 et le 28 de chaque mois.</li><li>Les fiches de paie sont disponibles via le portail RH.</li></ul><h4>2. Primes</h4><ul><li>Prime de rendement: évaluée trimestriellement.</li><li>Prime d\'ancienneté: +2% tous les 5 ans.</li><li>13ème mois: versé en décembre.</li></ul><h4>3. Avantages</h4><ul><li>Assurance maladie groupe</li><li>Tickets restaurant</li><li>Transport entreprise</li></ul>' },
    { icon: '📖', title: 'Règlement Intérieur', summary: 'Horaires, discipline et obligations des collaborateurs.',
      content: '<h4>1. Horaires de Travail</h4><ul><li>Horaire standard: 08h00 - 17h00 avec 1h de pause.</li><li>Pointage obligatoire à l\'arrivée et au départ.</li><li>Tout retard supérieur à 15 minutes doit être justifié.</li></ul><h4>2. Discipline</h4><ul><li>Avertissement verbal → Avertissement écrit → Mise à pied → Licenciement.</li><li>3 retards non justifiés = 1 avertissement écrit.</li></ul><h4>3. Tenue vestimentaire</h4><ul><li>Tenue professionnelle exigée en tout temps.</li></ul>' },
    { icon: '🎓', title: 'Formation & Développement', summary: 'Plans de formation et développement des compétences.',
      content: '<h4>1. Plan de Formation</h4><ul><li>Chaque collaborateur a droit à 5 jours de formation par an.</li><li>Les demandes sont soumises via le portail RH.</li></ul><h4>2. Évaluation</h4><ul><li>Entretien annuel d\'évaluation en janvier.</li><li>Objectifs SMART définis conjointement.</li></ul><h4>3. Mobilité Interne</h4><ul><li>Les postes vacants sont publiés en interne pendant 15 jours avant ouverture externe.</li></ul>' },
    { icon: '🏥', title: 'Santé & Sécurité', summary: 'Protocoles de santé au travail et mesures de sécurité.',
      content: '<h4>1. Médecine du Travail</h4><ul><li>Visite médicale annuelle obligatoire.</li><li>Visite de reprise après absence > 30 jours.</li></ul><h4>2. Sécurité</h4><ul><li>Formation sécurité incendie annuelle.</li><li>Exercice d\'évacuation semestriel.</li></ul><h4>3. Bien-être</h4><ul><li>Cellule d\'écoute psychologique disponible.</li><li>Programme de prévention des risques psychosociaux.</li></ul>' },
    { icon: '⚖️', title: 'Procédures Disciplinaires', summary: 'Échelle des sanctions et procédures de gestion des conflits.',
      content: '<h4>1. Échelle des Sanctions</h4><ul><li>Niveau 1: Rappel à l\'ordre verbal</li><li>Niveau 2: Avertissement écrit</li><li>Niveau 3: Mise à pied (1-5 jours)</li><li>Niveau 4: Licenciement pour faute</li></ul><h4>2. Procédure</h4><ul><li>Convocation écrite 48h à l\'avance.</li><li>Entretien contradictoire avec possibilité d\'accompagnement.</li><li>Notification écrite de la décision sous 72h.</li></ul>' }
  ];

  // Algerian holidays 2026
  private holidays: { month: number; day: number; name: string }[] = [
    { month: 0, day: 1, name: 'Jour de l\'An' },
    { month: 0, day: 12, name: 'Nouvel An Amazigh (Yennayer)' },
    { month: 1, day: 18, name: 'Journée du Chahid' },
    { month: 2, day: 8, name: 'Journée de la Femme' },
    { month: 2, day: 20, name: 'Aïd El Fitr' }, // Approximate
    { month: 2, day: 21, name: 'Aïd El Fitr (2ème jour)' },
    { month: 4, day: 1, name: 'Fête du Travail' },
    { month: 4, day: 27, name: 'Aïd El Adha' }, // Approximate
    { month: 4, day: 28, name: 'Aïd El Adha (2ème jour)' },
    { month: 5, day: 17, name: '1er Muharram' }, // Approximate
    { month: 6, day: 5, name: 'Fête de l\'Indépendance' },
    { month: 7, day: 26, name: 'Mawlid Ennabaoui' }, // Approximate
    { month: 10, day: 1, name: 'Anniversaire de la Révolution' }
  ];

  constructor(
    public auth: Auth, 
    private router: Router, 
    private activatedRoute: ActivatedRoute,
    private http: HttpClient,
    private notifService: NotificationService
  ) {}

  get role() { return this.auth.getRole() || 'EMPLOYE'; }

  sidebarTitle = computed(() => {
    switch(this.role) {
      case 'ADMIN': return 'Bondin Admin';
      case 'RH': return 'Bondin RH';
      case 'IT': return 'Bondin IT';
      default: return 'Bondin HR';
    }
  });

  ticketAlerts = computed(() => {
    const pendingReqs = this._allLeaves().filter(l => l.status === 'pending').length 
                      + this._allDocRequests().filter(d => d.status === 'pending').length;
    return pendingReqs;
  });

  messageAlerts = computed(() => this.notifService.unreadCount());

  rhDocAlerts = computed(() => {
    return this._allDocRequests().filter(r => r.status === 'pending').length;
  });

  leaveAlerts = computed(() => {
    return this._allLeaves().filter(l => l.status === 'pending').length;
  });

  pointageAlerts = computed(() => {
    return this._allPointages().filter(p => !p.confirmed).length;
  });

  ngOnInit() {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
    this.loadFromStorage();
    this.syncPointageStateWithBackend();

    // Deep linking via query params (e.g. /dashboard?view=leave)
    this.activatedRoute.queryParams.subscribe(params => {
      const v = params['view'];
      if (v) {
        // Simple validation to ensure it's a valid ViewType
        const validViews: ViewType[] = ['overview', 'calendar', 'pointage', 'leave', 'documents', 'received-docs', 'messages', 'tickets', 'rh-docs', 'rh-pointage', 'rh-leave', 'rh-doc-requests', 'admin-users'];
        if (validViews.includes(v as ViewType)) {
          this.setView(v as ViewType);
        }
      }
    });

    if (this.role === 'ADMIN' || this.role === 'RH') {
      this.loadStats();
    }
    this.loadLeaves();
    this.loadCoverImage();
    if (this.role === 'ADMIN') {
      this.loadUsers();
    }
  }

  loadLeaves() {
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    // My leaves
    this.http.get<LeaveRequest[]>('http://localhost:8080/api/leave/my', { headers }).subscribe({
      next: (data) => this._myLeaves.set(data),
      error: (err) => console.error('Error loading my leaves', err)
    });

    // All leaves (for RH/ADMIN)
    if (this.role === 'RH' || this.role === 'ADMIN') {
      this.http.get<LeaveRequest[]>('http://localhost:8080/api/leave/all', { headers }).subscribe({
        next: (data) => this._allLeaves.set(data),
        error: (err) => console.error('Error loading all leaves', err)
      });
    }
  }

  loadUsers() {
    this.http.get<any[]>('http://localhost:8080/api/admin/users').subscribe({
      next: (data) => this.users.set(data),
      error: (err) => console.error('Erreur chargement utilisateurs', err)
    });
  }

  addUser() {
    if (!this.newUser.nomUtilisateur || !this.newUser.email || !this.newUser.password) {
      alert('Veuillez renseigner tous les champs obligatoires.');
      return;
    }
    this.http.post('http://localhost:8080/api/admin/users', this.newUser).subscribe({
      next: () => {
        this.loadUsers();
        this.newUser = { nomUtilisateur: '', email: '', password: '', role: 'EMPLOYE' };
        this.showForm.set(false);
      },
      error: (err) => alert('Erreur lors de l’intégration du collaborateur.')
    });
  }

  openEditUser(user: any) {
    this.showForm.set(false);
    this.editUserDraft = {
      id: user.id,
      nomUtilisateur: user.nomUtilisateur || '',
      email: user.email || '',
      role: (user.role || 'EMPLOYE').toString().toUpperCase()
    };
    this.showEditForm.set(true);
  }

  closeEditUserForm() {
    this.showEditForm.set(false);
  }

  saveEditedUser() {
    const d = this.editUserDraft;
    if (!d.nomUtilisateur?.trim() || !d.email?.trim()) {
      alert('Veuillez renseigner le nom et l’email.');
      return;
    }
    this.http.put<any>(`http://localhost:8080/api/admin/users/${d.id}`, {
      nomUtilisateur: d.nomUtilisateur.trim(),
      email: d.email.trim(),
      role: d.role.trim().toUpperCase()
    }).subscribe({
      next: (updated) => {
        this.users.update(list => list.map(u => (u.id === d.id ? { ...u, ...updated } : u)));
        this.closeEditUserForm();
      },
      error: () => alert('Erreur lors de la modification.')
    });
  }

  revokeUser(user: any) {
    if (confirm(`Révoquer l'accès de ${user.nomUtilisateur} ?`)) {
      this.http.delete(`http://localhost:8080/api/admin/users/${user.id}`).subscribe({
        next: () => this.users.update(list => list.map(u => u.id === user.id ? { ...u, status: 'REVOKED' } : u)),
        error: () => alert('Erreur.')
      });
    }
  }

  reactivateUser(user: any) {
    if (confirm(`Réactiver l'accès de ${user.nomUtilisateur} ?`)) {
      this.http.put(`http://localhost:8080/api/admin/users/${user.id}/reactivate`, {}).subscribe({
        next: () => this.users.update(list => list.map(u => u.id === user.id ? { ...u, status: 'ACTIVE' } : u)),
        error: () => alert('Erreur.')
      });
    }
  }

  isOnline(user: any): boolean {
    if (!user.lastLogin || user.status === 'REVOKED') return false;
    const diff = (new Date().getTime() - new Date(user.lastLogin).getTime()) / (1000 * 60);
    return diff < 5;
  }

  getStatusKey(user: any): string {
    if (user.status === 'REVOKED') return 'ADMIN.REVOKED';
    return this.isOnline(user) ? 'ADMIN.ACTIVE' : 'ADMIN.OFFLINE';
  }

  getInitials(name: string): string {
    if (!name) return '??';
    const p = name.split(' ');
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  }

  onCoverSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const val = typeof reader.result === 'string' ? reader.result : 'assets/images/PC.jpg';
      this.coverImage.set(val);
      localStorage.setItem(`bondin.hub.cover.${this.auth.userProfile()?.id}`, val);
    };
    reader.readAsDataURL(file);
  }

  private loadCoverImage() {
    const saved = localStorage.getItem(`bondin.hub.cover.${this.auth.userProfile()?.id}`);
    if (saved) {
      this.coverImage.set(saved);
    } else {
      this.coverImage.set('assets/images/admin-cover.png');
    }
  }

  loadStats() {
    this.http.get<any>('http://localhost:8080/api/admin/users/stats').subscribe({
      next: (data) => this.stats.set(data),
      error: (err) => console.error('Erreur chargement stats', err)
    });
  }

  showFaqDetail(key: string) {
    this.selectedFaq.set(key);
    const stats = this.stats();
    if (stats) {
      const tickets = [
        ...(stats.openTicketList || []),
        ...(stats.resolvedTicketList || [])
      ].filter(t => t.sujet === key);
      this.selectedFaqTickets.set(tickets);
    }
  }

  showResponseStats() {
    this.showAvgResponseSection.update(v => !v);
    // Reset inner details when section is toggled
    this.showAvgResponseDetails.set(false);
  }

  getFaqInfo(key: string): string {
    const infoMap: Record<string, string> = {
      'congé': 'La politique des congés à la Maison Bondin permet 21 jours par an. Les demandes doivent être soumises 15 jours à l\'avance via le portail RH.',
      'paie': 'Les virements de salaire sont effectués entre le 25 et le 30 de chaque mois. Les fiches de paie sont disponibles sur le coffre-fort numérique.',
      'vpn': 'Pour tout problème de VPN, assurez-vous d\'utiliser le client Cisco AnyConnect avec vos identifiants @cafesbondin.tn.',
      'wifi': 'Le réseau "Bondin_Guest" est réservé aux visiteurs. Pour les collaborateurs, utilisez "Bondin_Corp" avec authentification WPA2.',
      'matériel': 'Les demandes de renouvellement de matériel (PC, Ecran) sont soumises à validation du N+1 et du département IT.',
      'formation': 'Le plan de formation annuel est discuté lors des entretiens annuels en Janvier.'
    };
    const v = infoMap[key.toLowerCase()];
    if (v) return v;

    // Better fallback (no “syncing…” message)
    const lang = this.auth.currentLang();
    if (lang === 'ar') {
      return 'لا توجد معلومة جاهزة لهذا الموضوع. جرّب كلمات مثل: إجازة، راتب، VPN، Wi‑Fi، كلمة المرور.';
    }
    if (lang === 'en') {
      return 'No quick entry for this topic yet. Try keywords like: leave, payroll, VPN, Wi‑Fi, password.';
    }
    return 'Aucune fiche rapide pour ce sujet. Essayez : congé, paie, VPN, Wi‑Fi, mot de passe.';
  }

  ngOnDestroy() {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  private updateClock() {
    const now = new Date();
    const lang = this.auth.currentLang();
    const locale = lang === 'ar' ? 'ar-DZ' : (lang === 'en' ? 'en-GB' : 'fr-FR');
    this.currentTime.set(now.toLocaleTimeString(locale));
    this.currentDateStr.set(
      now.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    );

    // Refresh the pointage window state on every tick.
    const open = this.isWithinPointageWindow(now);
    this.pointageOpen.set(open);
    if (!open) {
      const hour = now.getHours();
      const before = hour < DashboardHub.POINTAGE_START_HOUR;
      const start = `${DashboardHub.POINTAGE_START_HOUR.toString().padStart(2, '0')}:00`;
      const end   = `${DashboardHub.POINTAGE_END_HOUR.toString().padStart(2, '0')}:00`;
      this.pointageClosedMessage.set(
        before
          ? `Le pointage ouvrira à ${start}. Plage horaire autorisée : ${start} – ${end}.`
          : `Le pointage est fermé depuis ${end}. Réouverture demain à ${start}.`
      );
    } else {
      this.pointageClosedMessage.set('');
    }
  }

  /** Returns true iff the supplied moment falls inside the pointage window. */
  private isWithinPointageWindow(d: Date): boolean {
    const h = d.getHours();
    return h >= DashboardHub.POINTAGE_START_HOUR && h < DashboardHub.POINTAGE_END_HOUR;
  }

  // ═══ STORAGE ═══
  private storageKey(key: string) { return `bondin.hub.${key}.${localStorage.getItem('userId') || '0'}`; }

  private loadFromStorage() {
    const pointages = JSON.parse(localStorage.getItem(this.storageKey('pointages')) || '[]');
    this._pointageHistory.set(pointages);
    const leaves = JSON.parse(localStorage.getItem(this.storageKey('leaves')) || '[]');
    this._myLeaves.set(leaves);
    const allLeaves = JSON.parse(localStorage.getItem('bondin.hub.allLeaves') || '[]');
    this._allLeaves.set(allLeaves);
    const docReqs = JSON.parse(localStorage.getItem(this.storageKey('docRequests')) || '[]');
    this._myDocRequests.set(docReqs);
    const allDocReqs = JSON.parse(localStorage.getItem('bondin.hub.allDocRequests') || '[]');
    this._allDocRequests.set(allDocReqs);
    const allPointages = JSON.parse(localStorage.getItem('bondin.hub.allPointages') || '[]');
    this._allPointages.set(allPointages);
    const balance = localStorage.getItem(this.storageKey('leaveBalance'));
    if (balance) this.leaveBalance.set(Number(balance));
    this.loadAllUsers();
  }

  private loadAllUsers() {
    this.http.get<any[]>('http://localhost:8080/api/admin/users').subscribe({
      next: (data) => this._allUsers.set(data),
      error: (err) => console.error('Erreur chargement utilisateurs', err)
    });
  }

  nonRhUsers = computed(() => {
    return this._allUsers().filter(u => u.role !== 'RH' && u.role !== 'ADMIN');
  });

  private saveToStorage(key: string, data: any, global = false) {
    const k = global ? `bondin.hub.${key}` : this.storageKey(key);
    localStorage.setItem(k, JSON.stringify(data));
  }

  // ═══ SIDEBAR ═══
  toggleSidebar() { this.sidebarCollapsed.update(v => !v); }
  setView(view: ViewType) { this.activeView.set(view); this.mobileMenuOpen.set(false); }
  goToAdmin() { this.router.navigate(['/admin']); }

  // ═══ CALENDAR ═══
  prevMonth() {
    if (this.calMonth() === 0) { this.calMonth.set(11); this.calYear.update(y => y - 1); }
    else this.calMonth.update(m => m - 1);
  }
  nextMonth() {
    if (this.calMonth() === 11) { this.calMonth.set(0); this.calYear.update(y => y + 1); }
    else this.calMonth.update(m => m + 1);
  }

  calendarDays = computed<CalDay[]>(() => {
    const y = this.calYear(), m = this.calMonth();
    const firstDay = new Date(y, m, 1);
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const daysInPrev = new Date(y, m, 0).getDate();
    const today = new Date();
    const days: CalDay[] = [];
    const approvedLeaves = this._myLeaves().filter(l => l.status === 'approved');

    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ date: daysInPrev - i, isToday: false, isHoliday: false, isWeekend: false, otherMonth: true, isLeave: false, tooltip: '' });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(y, m, d);
      const dow = dt.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const holiday = this.holidays.find(h => h.month === m && h.day === d);
      const isLeave = approvedLeaves.some(l => {
        const s = new Date(l.startDate), e = new Date(l.endDate);
        return dt >= s && dt <= e;
      });
      days.push({
        date: d,
        isToday: d === today.getDate() && m === today.getMonth() && y === today.getFullYear(),
        isHoliday: !!holiday,
        isWeekend,
        otherMonth: false,
        isLeave,
        tooltip: holiday ? holiday.name : ''
      });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: i, isToday: false, isHoliday: false, isWeekend: false, otherMonth: true, isLeave: false, tooltip: '' });
    }
    return days;
  });

  // ═══ POINTAGE ═══
  todayPointage(): PointageRecord | null {
    const today = new Date().toISOString().split('T')[0];
    return this._pointageHistory().find(p => p.date === today) || null;
  }

  clockIn() {
    const now = new Date();
    if (!this.isWithinPointageWindow(now)) {
      alert(this.pointageClosedMessage());
      return;
    }
    const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const isRetard = now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 30);
    const record: PointageRecord = {
      id: Date.now(), date: now.toISOString().split('T')[0], clockIn: time, clockOut: null,
      status: isRetard ? 'retard' : 'present',
      userName: this.auth.userProfile()?.nomComplet || 'Utilisateur',
      userId: Number(localStorage.getItem('userId') || 0), confirmed: false
    };
    this._pointageHistory.update(list => [record, ...list]);
    this.saveToStorage('pointages', this._pointageHistory());
    this._allPointages.update(list => [record, ...list]);
    this.saveToStorage('allPointages', this._allPointages(), true);

    this.syncClockInWithBackend(record);
  }

  /**
   * Persists the clock-in on the server and reflects the authoritative counters
   * (retards + leave balance) returned by the backend. The server is the source
   * of truth for the sanction policy: retards > 08:30 are flagged automatically,
   * and every 5 retards = -1 day of leave balance.
   */
  private syncClockInWithBackend(record: PointageRecord) {
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    this.http.post<{
      status: 'present' | 'retard';
      time: string;
      late: boolean;
      nbRetards: number;
      congeRestant: number;
      leaveDeducted: boolean;
      retardsUntilDeduction: number;
      retardsPerDeduction: number;
      windowOpen: boolean;
    }>('http://localhost:8080/api/pointage/clock-in', {}, { headers }).subscribe({
      next: (res) => {
        if (res.status === 'retard' && record.status !== 'retard') {
          this._pointageHistory.update(list => list.map(p => p.id === record.id ? { ...p, status: 'retard' } : p));
          this._allPointages.update(list => list.map(p => p.id === record.id ? { ...p, status: 'retard' } : p));
          this.saveToStorage('pointages', this._pointageHistory());
          this.saveToStorage('allPointages', this._allPointages(), true);
        }

        this.leaveBalance.set(res.congeRestant);
        this.saveToStorage('leaveBalance', res.congeRestant);

        if (res.leaveDeducted) {
          this.notifService.addNotification(
            `5 retards atteints — 1 jour de congé déduit. Solde : ${res.congeRestant} j.`,
            '⚠️'
          );
        } else if (res.late) {
          this.notifService.addNotification(
            `Retard enregistré (${res.time}). ${res.retardsUntilDeduction} retard(s) avant la prochaine déduction.`,
            '⏰'
          );
        } else {
          this.notifService.addNotification(`Arrivée pointée à ${res.time}.`, '🕐');
        }
      },
      error: (err) => {
        console.error('Pointage backend sync failed', err);
        this.notifService.addNotification(
          'Pointage enregistré localement (synchronisation serveur échouée).',
          '⚠️'
        );
      }
    });
  }

  /**
   * Aligns the sidebar leave balance with the DB on dashboard load, and
   * backfills any retards captured before the server-side flow existed (so
   * historical localStorage retards still trigger their pending −1-day
   * deduction the first time the user lands on the new build).
   */
  private syncPointageStateWithBackend() {
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    this.http.get<{
      nbRetards: number;
      congeRestant: number;
      retardsBeforeNextDeduction: number;
      retardsPerDeduction: number;
      leaveDaysAlreadyDeducted: number;
    }>('http://localhost:8080/api/pointage/state', { headers }).subscribe({
      next: (state) => {
        this.leaveBalance.set(state.congeRestant);
        this.saveToStorage('leaveBalance', state.congeRestant);

        const localRetards = this._pointageHistory().filter(p => p.status === 'retard').length;
        if (localRetards > state.nbRetards) {
          this.http.post<{
            nbRetards: number;
            congeRestant: number;
            leaveDaysDeducted: number;
            retardsBeforeNextDeduction: number;
            retardsPerDeduction: number;
          }>('http://localhost:8080/api/pointage/reconcile',
            { totalRetards: localRetards },
            { headers }
          ).subscribe({
            next: (rec) => {
              this.leaveBalance.set(rec.congeRestant);
              this.saveToStorage('leaveBalance', rec.congeRestant);
              if (rec.leaveDaysDeducted > 0) {
                this.notifService.addNotification(
                  `Régularisation: ${rec.leaveDaysDeducted} jour(s) de congé déduit(s) pour retards. Solde : ${rec.congeRestant} j.`,
                  '⚠️'
                );
              }
            },
            error: (err) => console.error('Pointage reconcile failed', err)
          });
        }
      },
      error: (err) => console.error('Pointage state fetch failed', err)
    });
  }

  clockOut() {
    const now = new Date();
    if (!this.isWithinPointageWindow(now)) {
      alert(this.pointageClosedMessage());
      return;
    }
    const today = now.toISOString().split('T')[0];
    const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    this._pointageHistory.update(list => list.map(p => p.date === today ? { ...p, clockOut: time } : p));
    this.saveToStorage('pointages', this._pointageHistory());
    this._allPointages.update(list => list.map(p => p.date === today && p.userId === Number(localStorage.getItem('userId')) ? { ...p, clockOut: time } : p));
    this.saveToStorage('allPointages', this._allPointages(), true);
  }

  pointageHistory = computed(() => this._pointageHistory());
  allPointages = computed(() => this._allPointages());

  confirmPointage(p: PointageRecord) {
    this._allPointages.update(list => list.map(x => x.id === p.id ? { ...x, confirmed: true } : x));
    this.saveToStorage('allPointages', this._allPointages(), true);
  }

  flagPointage(p: PointageRecord) {
    this._allPointages.update(list => list.map(x => x.id === p.id ? { ...x, status: 'retard', confirmed: true } : x));
    this.saveToStorage('allPointages', this._allPointages(), true);
  }

  // ═══ LEAVE ═══
  leaveCircle() {
    const pct = this.leaveBalance() / 30;
    const circumference = 2 * Math.PI * 35;
    return `${circumference * pct} ${circumference}`;
  }

  submitLeave() {
    if (!this.newLeave.startDate || !this.newLeave.endDate) { alert('Remplissez les dates.'); return; }
    
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    this.http.post<LeaveRequest>('http://localhost:8080/api/leave/request', this.newLeave, { headers }).subscribe({
      next: (res) => {
        this._myLeaves.update(list => [res, ...list]);
        this.newLeave = { startDate: '', endDate: '', type: 'annual', reason: '' };
        this.notifService.addNotification('Demande de congé envoyée.', '🏖️');
      },
      error: (err) => alert('Erreur lors de la soumission de la demande.')
    });
  }

  myLeaves = computed(() => this._myLeaves());
  allLeaves = computed(() => this._allLeaves());

  createLeaveDocRequest(l: LeaveRequest) {
    const leaveDoc: DocRequest = {
      id: Date.now(),
      userId: l.userId,
      userName: l.userName,
      type: 'recu_conge',
      note: `Congé du ${l.startDate} au ${l.endDate} - Type: ${l.type} - Motif: ${l.reason}`,
      destinataire: '',
      date: new Date().toISOString().split('T')[0],
      status: 'approved',
      receiverName: l.userName,
      approvedAt: new Date().toISOString().split('T')[0]
    };
    this._allDocRequests.update(list => [leaveDoc, ...list]);
    this.saveToStorage('allDocRequests', this._allDocRequests(), true);
    
    // Also save to the employee's personal storage
    const key = `bondin.hub.docRequests.${l.userId}`;
    const employeeDocs: DocRequest[] = JSON.parse(localStorage.getItem(key) || '[]');
    employeeDocs.unshift(leaveDoc);
    localStorage.setItem(key, JSON.stringify(employeeDocs));
    
    // If the current user is the employee, update their view
    const myId = Number(localStorage.getItem('userId') || 0);
    if (myId === l.userId) {
      this._myDocRequests.set(employeeDocs);
    }
  }

  approveLeave(l: LeaveRequest) {
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    this.http.post<any>(`http://localhost:8080/api/leave/approve/${l.id}`, {}, { headers }).subscribe({
      next: (res) => {
        this._allLeaves.update(list => list.map(x => x.id === l.id ? { ...x, status: 'approved' } : x));
        this.notifService.addNotification(`Congé approuvé pour ${l.userName}`, '✅');
        this.createLeaveDocRequest(l);
        // Refresh my balance if I approved my own (though rare)
        this.syncPointageStateWithBackend();
      },
      error: (err) => alert('Erreur lors de la validation.')
    });
  }

  generateLeaveReceipt(l: LeaveRequest) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reçu de Congé - ${l.userName}</title>
        <style>
          body {
            font-family: 'Georgia', 'Times New Roman', serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 2rem;
            margin: 0;
          }
          .receipt-container {
            max-width: 700px;
            margin: 0 auto;
            background: white;
            padding: 3rem;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
            border: 2px solid #8B1538;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #8B1538;
            padding-bottom: 1.5rem;
            margin-bottom: 2rem;
          }
          .header h1 {
            color: #8B1538;
            font-size: 2rem;
            margin: 0 0 0.5rem 0;
            font-weight: bold;
          }
          .header .subtitle {
            color: #666;
            font-style: italic;
            font-size: 1.1rem;
          }
          .content {
            line-height: 1.8;
            color: #333;
          }
          .field {
            margin: 1rem 0;
            padding: 0.75rem;
            background: #f9f9f9;
            border-left: 4px solid #8B1538;
            border-radius: 4px;
          }
          .field-label {
            font-weight: bold;
            color: #8B1538;
            display: block;
            margin-bottom: 0.25rem;
          }
          .field-value {
            font-size: 1.1rem;
          }
          .status {
            text-align: center;
            margin: 2rem 0;
            padding: 1rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 1.3rem;
            font-weight: bold;
            border-radius: 8px;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .footer {
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 0.9rem;
          }
          .logo {
            font-size: 3rem;
            text-align: center;
            margin-bottom: 1rem;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="logo">☕</div>
          <div class="header">
            <h1>REÇU DE CONGÉ</h1>
            <div class="subtitle">Maison Bondin Heritage</div>
          </div>
          <div class="content">
            <div class="field">
              <span class="field-label">Date d'émission</span>
              <span class="field-value">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div class="field">
              <span class="field-label">Collaborateur</span>
              <span class="field-value">${l.userName}</span>
            </div>
            <div class="field">
              <span class="field-label">Type de congé</span>
              <span class="field-value">${l.type}</span>
            </div>
            <div class="field">
              <span class="field-label">Période</span>
              <span class="field-value">Du ${l.startDate} Au ${l.endDate}</span>
            </div>
            <div class="field">
              <span class="field-label">Motif</span>
              <span class="field-value">${l.reason || 'Non spécifié'}</span>
            </div>
            <div class="status">
              ✓ APPROUVÉ PAR LE SERVICE RH
            </div>
          </div>
          <div class="footer">
            <p>Ce document fait office de justificatif officiel.</p>
            <p>Document émis depuis le portail Bondin RH.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
    }
  }

  rejectLeave(l: LeaveRequest) {
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    this.http.post<any>(`http://localhost:8080/api/leave/reject/${l.id}`, {}, { headers }).subscribe({
      next: () => {
        this._allLeaves.update(list => list.map(x => x.id === l.id ? { ...x, status: 'rejected' } : x));
        this.notifService.addNotification(`Congé refusé pour ${l.userName}`, '❌');
      },
      error: (err) => alert('Erreur lors du refus.')
    });
  }

  // ═══ DOCUMENT REQUESTS ═══
  submitDocRequest() {
    const req: DocRequest = {
      id: Date.now(),
      userId: Number(localStorage.getItem('userId') || 0),
      userName: this.auth.userProfile()?.nomComplet || 'Utilisateur',
      type: this.newDocRequest.type, note: this.newDocRequest.note,
      destinataire: this.newDocRequest.destinataire,
      date: new Date().toISOString().split('T')[0], status: 'pending'
    };
    this._myDocRequests.update(list => [req, ...list]);
    this._allDocRequests.update(list => [req, ...list]);
    this.saveToStorage('docRequests', this._myDocRequests());
    this.saveToStorage('allDocRequests', this._allDocRequests(), true);
    this.newDocRequest = { type: 'attestation_travail', note: '', destinataire: '' };
  }

  myDocRequests = computed(() => this._myDocRequests());
  allDocRequests = computed(() => this._allDocRequests());
  receivedDocs = computed(() => {
    const myId = Number(localStorage.getItem('userId') || 0);
    return this._allDocRequests().filter(r => r.userId === myId && r.status === 'approved');
  });

  /** Met à jour une demande doc côté global et dans le coffre du collaborateur */
  private persistDocRequest(updated: DocRequest) {
    this._allDocRequests.update(list => list.map(x => x.id === updated.id ? { ...x, ...updated } : x));
    this.saveToStorage('allDocRequests', this._allDocRequests(), true);
    const key = `bondin.hub.docRequests.${updated.userId}`;
    const list: DocRequest[] = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = list.findIndex(x => x.id === updated.id);
    const next = idx >= 0
      ? list.map(x => (x.id === updated.id ? { ...x, ...updated } : x))
      : [...list, { ...updated }];
    localStorage.setItem(key, JSON.stringify(next));
    const myId = Number(localStorage.getItem('userId') || 0);
    if (myId === updated.userId) {
      this._myDocRequests.set(next);
    }
  }

  openDocCompletion(d: DocRequest) {
    this.docBeingCompleted.set(d);
    this.completionReceiverName = (d.userName || '').trim();
    this.signatureTouched = false;
    this.docCompletionOpen.set(true);
    setTimeout(() => this.resetSigCanvas(), 50);
  }

  closeDocCompletion() {
    this.docCompletionOpen.set(false);
    this.docBeingCompleted.set(null);
    this.completionReceiverName = '';
    this.signatureTouched = false;
    this.sigDrawing = false;
  }

  resetSigCanvas() {
    const c = this.docSigCanvas?.nativeElement;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    this.signatureTouched = false;
  }

  private canvasCoords(e: MouseEvent | TouchEvent): { x: number; y: number } {
    const c = this.docSigCanvas!.nativeElement;
    const r = c.getBoundingClientRect();
    let clientX: number;
    let clientY: number;
    if ('touches' in e && e.touches.length) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return { x: 0, y: 0 };
    }
    const scaleX = c.width / r.width;
    const scaleY = c.height / r.height;
    return { x: (clientX - r.left) * scaleX, y: (clientY - r.top) * scaleY };
  }

  sigStart(e: MouseEvent | TouchEvent) {
    e.preventDefault();
    this.sigDrawing = true;
    this.sigLast = this.canvasCoords(e);
  }

  sigMove(e: MouseEvent | TouchEvent) {
    if (!this.sigDrawing) return;
    e.preventDefault();
    const c = this.docSigCanvas?.nativeElement;
    const ctx = c?.getContext('2d');
    if (!ctx) return;
    const p = this.canvasCoords(e);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(this.sigLast.x, this.sigLast.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    this.sigLast = p;
    this.signatureTouched = true;
  }

  sigEnd() {
    this.sigDrawing = false;
  }

  confirmDocCompletion() {
    const d = this.docBeingCompleted();
    if (!d) return;
    const receiverName = this.completionReceiverName.trim();
    if (!receiverName) {
      alert('Veuillez indiquer le nom du destinataire (remise du document).');
      return;
    }
    const canvas = this.docSigCanvas?.nativeElement;
    if (!canvas || !this.signatureTouched) {
      alert('Veuillez signer dans la zone prévue avant d’envoyer le document.');
      return;
    }
    const rhSignatureDataUrl = canvas.toDataURL('image/png');
    const approvedAt = new Date().toISOString().split('T')[0];
    this.persistDocRequest({
      ...d,
      status: 'approved',
      receiverName,
      rhSignatureDataUrl,
      approvedAt
    });
    this.closeDocCompletion();
  }

  rejectDoc(d: DocRequest) {
    if (!confirm('Refuser cette demande de document ?')) return;
    this.persistDocRequest({ ...d, status: 'rejected' });
  }

  printApprovedDoc(d: DocRequest) {
    const title = this.docTypeLabel(d.type);
    const receiver = d.receiverName || d.userName;
    const sigBlock = d.rhSignatureDataUrl
      ? `<div class="signature-block">
          <strong>Signature du service RH</strong><br>
          <img src="${d.rhSignatureDataUrl}" alt="Signature" class="signature-image"/>
        </div>`
      : '';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body {
            font-family: 'Georgia', 'Times New Roman', serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 2rem;
            margin: 0;
          }
          .doc-container {
            max-width: 700px;
            margin: 0 auto;
            background: white;
            padding: 3rem;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
            border: 2px solid #8B1538;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #8B1538;
            padding-bottom: 1.5rem;
            margin-bottom: 2rem;
          }
          .header h1 {
            color: #8B1538;
            font-size: 2rem;
            margin: 0 0 0.5rem 0;
            font-weight: bold;
          }
          .header .subtitle {
            color: #666;
            font-style: italic;
            font-size: 1.1rem;
          }
          .content {
            line-height: 1.8;
            color: #333;
          }
          .field {
            margin: 1rem 0;
            padding: 0.75rem;
            background: #f9f9f9;
            border-left: 4px solid #8B1538;
            border-radius: 4px;
          }
          .field-label {
            font-weight: bold;
            color: #8B1538;
            display: block;
            margin-bottom: 0.25rem;
          }
          .field-value {
            font-size: 1.1rem;
          }
          .signature-block {
            margin-top: 2rem;
            padding: 1rem;
            background: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 8px;
            text-align: center;
          }
          .signature-block strong {
            color: #8B1538;
            display: block;
            margin-bottom: 0.5rem;
          }
          .signature-image {
            max-width: 320px;
            border: 1px solid #ccc;
            margin-top: 0.5rem;
            border-radius: 4px;
          }
          .footer {
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 0.9rem;
          }
          .logo {
            font-size: 3rem;
            text-align: center;
            margin-bottom: 1rem;
          }
        </style>
      </head>
      <body>
        <div class="doc-container">
          <div class="logo">☕</div>
          <div class="header">
            <h1>${title}</h1>
            <div class="subtitle">Maison Bondin Heritage</div>
          </div>
          <div class="content">
            <div class="field">
              <span class="field-label">Demandeur</span>
              <span class="field-value">${d.userName}</span>
            </div>
            <div class="field">
              <span class="field-label">Destinataire (remise)</span>
              <span class="field-value">${receiver}</span>
            </div>
            <div class="field">
              <span class="field-label">Date de validation RH</span>
              <span class="field-value">${d.approvedAt || d.date}</span>
            </div>
            ${d.note ? `<div class="field">
              <span class="field-label">Remarque</span>
              <span class="field-value">${d.note}</span>
            </div>` : ''}
            ${sigBlock}
          </div>
          <div class="footer">
            <p>Document émis depuis le portail Bondin RH.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
    }
  }

  docTypeLabel(type: string): string {
    const map: Record<string, string> = {
      'attestation_travail': 'Attestation de travail', 'attestation_salaire': 'Attestation de salaire',
      'fiche_paie': 'Fiche de paie', 'certificat_travail': 'Certificat de travail',
      'ordre_mission': 'Ordre de mission', 'autre': 'Autre', 'recu_conge': 'Reçu de congé'
    };
    return map[type] || type;
  }

  // ═══ STATS ═══
  pendingDocRequests() { return this._myDocRequests().filter(d => d.status === 'pending').length; }
  pendingLeaves() { return this._myLeaves().filter(l => l.status === 'pending').length; }

  // ═══ CHART HELPERS ═══
  private chartPt(data: number[], idx: number): { x: number; y: number } {
    const maxVal = Math.max(...data, 1);
    return { x: 55 + idx * 95, y: 170 - (data[idx] / maxVal) * 140 };
  }

  chartPoints() { return this.chartData1.map((_, i) => this.chartPt(this.chartData1, i)); }
  chartPoints2() { return this.chartData2.map((_, i) => this.chartPt(this.chartData2, i)); }

  chartLinePoints() { return this.chartPoints().map(p => `${p.x},${p.y}`).join(' '); }
  chartLine2Points() { return this.chartPoints2().map(p => `${p.x},${p.y}`).join(' '); }

  chartAreaPoints() {
    const pts = this.chartPoints();
    return `${pts[0].x},170 ${pts.map(p => `${p.x},${p.y}`).join(' ')} ${pts[pts.length - 1].x},170`;
  }
  chartArea2Points() {
    const pts = this.chartPoints2();
    return `${pts[0].x},170 ${pts.map(p => `${p.x},${p.y}`).join(' ')} ${pts[pts.length - 1].x},170`;
  }

  // ═══ PROGRESS CHARTS ═══
  realProgressStats = computed(() => {
    // 1. Taux de présence
    const pts = (this.role === 'RH' || this.role === 'ADMIN') ? this._allPointages() : this._pointageHistory();
    const presenceRate = pts.length > 0 
      ? Math.round((pts.filter(p => p.status === 'present').length / pts.length) * 100) 
      : 85;

    // 2. Demandes traitées
    const allReqs = [...this._allLeaves(), ...this._allDocRequests()];
    const processed = allReqs.filter(r => r.status !== 'pending').length;
    const processRate = allReqs.length > 0
      ? Math.round((processed / allReqs.length) * 100)
      : 60;

    // 3. Satisfaction (Influenced by approval rate)
    const approved = allReqs.filter(r => r.status === 'approved').length;
    const satisfactionRate = allReqs.length > 0
      ? Math.round((approved / allReqs.length) * 10 + 85) // Base 85% + bonus for approvals
      : 92;

    const stats = [
      { label: 'Taux de présence', value: Math.min(presenceRate, 100), color: 'var(--gold)' },
      { label: 'Demandes traitées', value: Math.min(processRate, 100), color: 'var(--red)' },
      { label: 'Satisfaction', value: Math.min(satisfactionRate, 100), color: '#4caf50' }
    ];

    if (this.role === 'EMPLOYE') {
      return stats.filter(s => s.label !== 'Demandes traitées');
    }
    return stats;
  });

  // ═══ RH ACTIONS ═══
  addRhDoc() {
    const title = prompt('Titre du document :');
    if (title) {
      this.rhDocs.push({ icon: '📄', title, summary: 'Nouveau document ajouté au système.', content: '<p>Contenu en cours de rédaction...</p>' });
    }
  }

  exportRhDoc(doc: RhDoc) {
    alert(`Exportation de "${doc.title}" en PDF en cours...`);
    // Mock PDF generation
    const printContent = `<h1>${doc.title}</h1><div>${doc.content}</div>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.print();
    }
  }

  uploadFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) alert(`Fichier "${file.name}" prêt à l'envoi.`);
    };
    input.click();
  }
}
