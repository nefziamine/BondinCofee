import { Component, OnInit, signal, computed } from '@angular/core';
import { Auth } from '../../../services/auth';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule, FormsModule, TranslateModule],
  template: `
    <div class="manage-users-page">
      <!-- Breadcrumb & Header -->
      <nav class="breadcrumb">
        <span>{{ 'AUTH.CABINET' | translate }}</span> / <span>{{ 'NAV.ADMIN_PANEL' | translate }}</span> / <span class="active">{{ 'ADMIN.TITLE' | translate }}</span>
      </nav>

      <header class="page-header">
        <div class="header-content">
          <h1 class="italic-title">{{ 'ADMIN.TITLE' | translate }}</h1>
          <p class="subtitle">{{ 'ADMIN.SUBTITLE' | translate }}</p>
        </div>

        <div class="profile-badge-container" *ngIf="auth.userProfile()">
          <div class="profile-photo">
            <img [src]="auth.userProfile().imageurl || 'assets/default-avatar.png'" alt="Profile">
          </div>
          <div class="profile-info" style="display: flex; flex-direction: column; align-items: center; gap: 0.2rem;">
            <span class="user-name" style="font-family: var(--font-body); font-weight: 600; color: var(--text); font-size: 0.9rem;">{{ auth.userProfile().nomComplet || 'Utilisateur Bondin' }}</span>
            <span class="dept">{{ auth.userProfile().department || 'Bondin Heritage' }}</span>
          </div>
        </div>

        <button class="btn-new-user" style="background: var(--gold); margin-right: 1rem;" routerLink="/requests">
          <span class="icon">✉️</span> Messagerie
        </button>
        <button class="btn-new-user" (click)="toggleForm()">
          <span class="plus">+</span> {{ 'ADMIN.NEW_USER' | translate }}
        </button>
      </header>

      <!-- User Creation Form (Toggled) -->
      <div class="creation-drawer" [class.open]="showForm()">
        <div class="drawer-header">
          <h3>{{ 'ADMIN.NEW_USER' | translate }}</h3>
          <button class="close-btn" (click)="toggleForm()">×</button>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>{{ 'ADMIN.NAME' | translate }}</label>
            <input type="text" [(ngModel)]="newUser.nomUtilisateur" placeholder="Ex: Ahmed Bondin">
          </div>
          <div class="form-group">
            <label>{{ 'ADMIN.EMAIL' | translate }}</label>
            <input type="email" [(ngModel)]="newUser.email" placeholder="votre.nom@cafesbondin.tn">
          </div>
          <div class="form-group">
            <label>{{ 'AUTH.PASSWORD' | translate }}</label>
            <input type="password" [(ngModel)]="newUser.password" placeholder="••••••••">
          </div>
          <div class="form-group">
            <label>{{ 'ADMIN.ROLE' | translate }}</label>
            <select [(ngModel)]="newUser.role">
              <option value="EMPLOYE">Employé</option>
              <option value="RH">Ressources Humaines</option>
              <option value="IT">Service IT</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>
          <div class="form-actions">
            <button (click)="addUser()" class="btn-submit">{{ 'AUTH.LOGIN_BTN' | translate }}</button>
          </div>
        </div>
      </div>

      <!-- Statistics Section -->
      <section class="stats-overview">
        <div class="kpi-grid" *ngIf="stats(); else statsLoading">
          <div class="kpi-card clickable" (click)="activeTab.set('ACTIVE')" [class.active-kpi]="activeTab() === 'ACTIVE'">
            <span class="kpi-label">{{ 'ADMIN.KPI.ACTIVE' | translate }}</span>
            <span class="kpi-value">{{ stats().totalActiveUsers }}</span>
            <span class="kpi-trend">+{{ stats().newUsersThisMonth }} ce mois</span>
          </div>
          <div class="kpi-card clickable" (click)="activeTab.set('OPEN')" [class.active-kpi]="activeTab() === 'OPEN'">
            <span class="kpi-label">{{ 'ADMIN.KPI.OPEN_TICKETS' | translate }}</span>
            <span class="kpi-value">{{ stats().openTickets }}</span>
            <span class="kpi-trend">En attente</span>
          </div>
          <div class="kpi-card clickable" (click)="activeTab.set('RESOLVED')" [class.active-kpi]="activeTab() === 'RESOLVED'">
            <span class="kpi-label">{{ 'ADMIN.KPI.RESOLVED' | translate }}</span>
            <span class="kpi-value">{{ stats().ticketsResolvedThisWeek }}</span>
            <span class="kpi-trend">Performance stable</span>
          </div>
          <div class="kpi-card clickable" (click)="activeTab.set('RESPONSE_TIME')" [class.active-kpi]="activeTab() === 'RESPONSE_TIME'">
            <span class="kpi-label">{{ 'ADMIN.KPI.RESPONSE_TIME' | translate }}</span>
            <span class="kpi-value">{{ stats().averageResponseTime }}h</span>
            <span class="kpi-trend">Moyenne globale</span>
          </div>
        </div>

        <ng-template #statsLoading>
          <div class="kpi-grid">
            <div class="kpi-card skeleton" *ngFor="let i of [1,2,3,4]">
               <div class="skeleton-line" style="width: 60%; height: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 10px;"></div>
               <div class="skeleton-line" style="width: 40%; height: 30px; background: rgba(255,255,255,0.1); border-radius: 4px;"></div>
            </div>
          </div>
          <div style="text-align: center; margin-top: 1rem; color: var(--text-muted); font-size: 0.8rem;">
             Synchronisation des données en cours... (Vérifiez votre connexion backend si cela persiste)
          </div>
        </ng-template>

        <!-- Details Drawer (Admin Panel Specialized) -->
        <div class="stats-detail-drawer animate-fade" *ngIf="activeTab()" style="background: var(--surface-secondary); margin-bottom: 3rem; padding: 2rem; border-left: 4px solid var(--gold); border-radius: 8px;">
           <div class="drawer-header" style="display: flex; justify-content: space-between; margin-bottom: 1.5rem; align-items: center;">
              <div>
                <h3 style="color: var(--gold); font-family: var(--font-display); font-style: italic; font-size: 1.8rem; margin: 0;">
                  {{ activeTab() === 'ACTIVE' ? 'Exploration: Collaborateurs Actifs' : (activeTab() === 'OPEN' ? 'Exploration: Tickets en Attente' : (activeTab() === 'RESOLVED' ? 'Exploration: Archive des Résolutions' : 'Analytique: Temps de Réponse')) }}
                </h3>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.3rem;">Données synchronisées en temps réel avec la base de données Maison Bondin.</p>
              </div>
              <button (click)="activeTab.set(null)" style="background:none; border:none; color: var(--text-muted); font-size: 2rem; cursor:pointer; line-height: 1;">×</button>
           </div>
           
           <div class="drawer-content" style="max-height: 400px; overflow-y: auto; padding-right: 1rem;">
              <table class="bondin-styled-table" style="width: 100%; border-collapse: collapse;">
                 <!-- ACTIVE USERS -->
                 <thead *ngIf="activeTab() === 'ACTIVE'">
                    <tr style="text-align: left; color: var(--gold); font-size: 0.8rem; border-bottom: 1px solid var(--border);">
                       <th style="padding: 1rem;">Collaborateur</th>
                       <th style="padding: 1rem;">Contact</th>
                       <th style="padding: 1rem;">Poste / Rôle</th>
                       <th style="padding: 1rem;">Dernière Activité</th>
                    </tr>
                 </thead>
                 <tbody *ngIf="activeTab() === 'ACTIVE'">
                    <tr *ngFor="let u of stats().activeUserList" style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: 0.2s;" class="hover-row">
                       <td style="padding: 1rem; font-weight: 600;">{{ u.nomUtilisateur }}</td>
                       <td style="padding: 1rem; color: var(--gold); font-size: 0.9rem;">{{ u.email }}</td>
                       <td style="padding: 1rem;"><span class="role-badge" [class]="u.role">{{ u.role }}</span></td>
                       <td style="padding: 1rem; font-size: 0.8rem; opacity: 0.7;">{{ (u.lastLogin | date:'short') || 'Jamais connecté' }}</td>
                    </tr>
                 </tbody>

                 <!-- OPEN TICKETS -->
                 <thead *ngIf="activeTab() === 'OPEN'">
                    <tr style="text-align: left; color: var(--gold); font-size: 0.8rem; border-bottom: 1px solid var(--border);">
                       <th style="padding: 1rem;">Sujet & Catégorie</th>
                       <th style="padding: 1rem;">Émetteur</th>
                       <th style="padding: 1rem;">Détails de la Requête</th>
                       <th style="padding: 1rem;">Priorité</th>
                    </tr>
                 </thead>
                 <tbody *ngIf="activeTab() === 'OPEN'">
                    <tr *ngFor="let t of stats().openTicketList" style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                       <td style="padding: 1rem;">
                          <div style="font-weight: 600; color: var(--gold);">{{ t.sujet }}</div>
                          <div style="font-size: 0.7rem; text-transform: uppercase; opacity: 0.6;">Dép: {{ t.category || 'Général' }}</div>
                       </td>
                       <td style="padding: 1rem; font-size:0.9rem;">
                          <div style="display: flex; align-items: center; gap: 0.8rem;">
                             <img *ngIf="stats().userPhotos?.[t.userEmail]" 
                                  [src]="stats().userPhotos[t.userEmail]" 
                                  style="width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid var(--gold); object-fit: cover; background: var(--surface);">
                             <span>{{ t.userEmail }}</span>
                          </div>
                       </td>
                       <td style="padding: 1rem; font-size: 0.85rem; line-height: 1.4; max-width: 400px;">{{ t.description }}</td>
                       <td style="padding: 1rem;"><span style="color: #ff5247; font-size: 0.7rem; font-weight: 800;">EN ATTENTE</span></td>
                    </tr>
                    <tr *ngIf="stats().openTickets === 0">
                       <td colspan="4" style="padding: 3rem; text-align: center; color: var(--text-muted); font-style: italic;">Aucun ticket en attente dans la base de données.</td>
                    </tr>
                 </tbody>

                  <!-- RESOLVED TICKETS -->
                  <thead *ngIf="activeTab() === 'RESOLVED'">
                    <tr style="text-align: left; color: var(--gold); font-size: 0.8rem; border-bottom: 1px solid var(--border);">
                       <th style="padding: 1rem;">Sujet</th>
                       <th style="padding: 1rem;">Solution Apportée (Base DB)</th>
                       <th style="padding: 1rem;">Date Résolution</th>
                    </tr>
                  </thead>
                  <tbody *ngIf="activeTab() === 'RESOLVED'">
                    <tr *ngFor="let t of stats().resolvedTicketList" style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                       <td style="padding: 1rem; font-weight: 600;">{{ t.sujet }}</td>
                       <td style="padding: 1rem; font-size: 0.9rem; font-style: italic; color: var(--text-muted); line-height: 1.4; max-width: 500px;">{{ t.reponse }}</td>
                       <td style="padding: 1rem; font-size: 0.8rem; opacity: 0.6;">{{ t.dateCreation | date:'dd/MM/yyyy' }}</td>
                    </tr>
                    <tr *ngIf="stats().ticketsResolvedThisWeek === 0">
                       <td colspan="3" style="padding: 3rem; text-align: center; color: var(--text-muted); font-style: italic;">Aucune archive de résolution pour le moment.</td>
                    </tr>
                  </tbody>

                  <!-- RESPONSE TIME INSIGHTS -->
                  <div *ngIf="activeTab() === 'RESPONSE_TIME'" style="padding: 1rem 0;">
                     <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <div style="background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 8px; border: 1px solid rgba(184,136,42,0.1);">
                           <div style="font-size: 0.7rem; text-transform: uppercase; color: var(--gold);">Rapidité IT</div>
                           <div style="font-size: 2rem; font-family: var(--font-display); font-style: italic;">0.8h</div>
                           <p style="font-size: 0.75rem; opacity: 0.7;">Performance supérieure à la moyenne.</p>
                        </div>
                        <div style="background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 8px; border: 1px solid rgba(184,136,42,0.1);">
                           <div style="font-size: 0.7rem; text-transform: uppercase; color: var(--gold);">Rapidité RH</div>
                           <div style="font-size: 2rem; font-family: var(--font-display); font-style: italic;">2.2h</div>
                           <p style="font-size: 0.75rem; opacity: 0.7;">Flux volumineux ce mois-ci.</p>
                        </div>
                        <div style="background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 8px; border: 1px solid rgba(184,136,42,0.1);">
                           <div style="font-size: 0.7rem; text-transform: uppercase; color: var(--gold);">SLA Global</div>
                           <div style="font-size: 2rem; font-family: var(--font-display); font-style: italic;">94%</div>
                           <p style="font-size: 0.75rem; opacity: 0.7;">Contrats de service respectés.</p>
                        </div>
                     </div>
                  </div>
               </table>
           </div>
        </div>

        <div class="stats-row">
          <div class="stats-panel faq-panel">
            <h3>Questions Fréquentes</h3>
            <div class="faq-item clickable-item" *ngFor="let item of stats().faqRankings | keyvalue" (click)="searchQuery.set($any(item.key)); activeTab.set('OPEN')">
              <span class="faq-name">{{ item.key }}</span>
              <span class="faq-count">{{ item.value }} requêtes</span>
            </div>
          </div>

          <div class="stats-panel load-panel">
            <h3>Charge par Département</h3>
            <div class="progress-item" *ngFor="let item of stats().departmentLoad | keyvalue">
              <div class="progress-info">
                <span>{{ item.key }}</span>
                <span>{{ item.value }}%</span>
              </div>
              <div class="progress-bg">
                <div class="progress-fill" [style.width.%]="item.value"></div>
              </div>
            </div>
          </div>

          <div class="stats-panel type-panel">
            <h3>Catégories de Réclamations</h3>
            <div class="progress-item" *ngFor="let item of stats().reclamationTypes | keyvalue" (click)="searchQuery.set($any(item.key)); activeTab.set('OPEN')" style="cursor: pointer;">
              <div class="progress-info">
                <span>{{ item.key }}</span>
                <span>{{ item.value }}%</span>
              </div>
              <div class="progress-bg">
                <div class="progress-fill red" [style.width.%]="item.value"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Filters & Search -->
      <div class="controls-row">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" [placeholder]="'ADMIN.SEARCH_PLACEHOLDER' | translate">
        </div>
        <div class="filter-box">
          <select [ngModel]="roleFilter()" (ngModelChange)="roleFilter.set($event)">
            <option value="ALL">{{ 'ADMIN.ALL_ROLES' | translate }}</option>
            <option value="ADMIN">Administrateurs</option>
            <option value="RH">RH</option>
            <option value="IT">IT</option>
            <option value="EMPLOYE">Employé</option>
          </select>
        </div>
      </div>

      <!-- Users Grid/Table -->
      <div class="table-container shadow">
        <table class="bondin-styled-table">
          <thead>
            <tr>
              <th>{{ 'ADMIN.NAME' | translate }}</th>
              <th>{{ 'ADMIN.EMAIL' | translate }}</th>
              <th>{{ 'ADMIN.ROLE' | translate }}</th>
              <th>{{ 'ADMIN.STATUS' | translate }}</th>
              <th>{{ 'ADMIN.ARRIVAL' | translate }}</th>
              <th class="text-right">{{ 'ADMIN.ACTIONS' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of filteredUsers()" class="user-row">
              <td>
                <div class="user-info">
                  <div class="avatar">{{ getInitials(user.nomUtilisateur) }}</div>
                  <div class="name-box">
                    <span class="user-name">{{ user.nomUtilisateur }}</span>
                    <span class="user-id">#{{ user.id }}</span>
                  </div>
                </div>
              </td>
              <td><span class="text-muted">{{ user.email }}</span></td>
              <td><span class="role-badge" [class]="user.role">{{ user.role }}</span></td>
              <td>
                <span class="status-badge" [class.active]="isOnline(user)" [class.revoked]="user.status === 'REVOKED'" [class.offline]="user.status === 'ACTIVE' && !isOnline(user)">
                  {{ getStatusKey(user) | translate }}
                </span>
              </td>
              <td><span class="text-muted">{{ user.createdAt | date:'dd/MM/yyyy' }}</span></td>
              <td class="text-right">
                <button *ngIf="user.status === 'ACTIVE'" (click)="revokeUser(user)" class="btn-revoke">{{ 'ADMIN.REVOKE' | translate }}</button>
              </td>
            </tr>
            <tr *ngIf="filteredUsers().length === 0">
              <td colspan="6" class="empty-state">
                <em>{{ 'ADMIN.EMPTY' | translate }}</em>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .manage-users-page { padding: 2rem; max-width: 1200px; margin: 0 auto; min-height: 100vh; }
    .breadcrumb { font-family: var(--font-ui); font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 2rem; }
    .breadcrumb .active { color: var(--gold); }
    
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem; gap: 2rem; }
    .italic-title { font-family: var(--font-display); font-style: italic; font-size: 3rem; margin: 0; }
    .subtitle { color: var(--text-muted); font-family: var(--font-body); opacity: 0.8; }

    .profile-badge-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1.5rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      min-width: 200px;
      transition: 0.3s;
      
      &:hover { border-color: var(--gold); }

      .profile-photo {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        overflow: hidden;
        border: 2px solid var(--gold);
        img { width: 100%; height: 100%; object-fit: cover; }
      }
      .profile-info .dept {
        font-family: var(--font-ui);
        text-transform: uppercase;
        font-size: 0.7rem;
        letter-spacing: 0.1em;
        color: var(--gold);
      }
    }
    
    .btn-new-user { background: var(--red); color: white; border: none; padding: 0.8rem 1.5rem; font-family: var(--font-ui); font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: 0.3s; }
    .btn-new-user:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(192, 40, 31, 0.3); }

    .creation-drawer { background: var(--surface-secondary); border: 1px solid var(--border); overflow: hidden; height: 0; transition: 0.4s ease; margin-bottom: 0; }
    .creation-drawer.open { height: auto; padding: 2rem; margin-bottom: 2rem; }
    .drawer-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .drawer-header h3 { font-family: var(--font-display); font-size: 1.5rem; color: var(--gold); }
    .close-btn { background: none; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer; }

    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }
    .form-group label { display: block; margin-bottom: 0.5rem; }
    .form-group input, .form-group select { width: 100%; background: var(--input-bg); border: 1px solid var(--input-border); color: var(--text); padding: 0.8rem; }
    .btn-submit { background: var(--gold); color: white; border: none; padding: 1rem; cursor: pointer; font-family: var(--font-ui); font-weight: 600; width: 100%; margin-top: 1rem; }

    .controls-row { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
    .search-box { flex: 1; position: relative; }
    .search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); opacity: 0.5; }
    .search-box input { width: 100%; background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 0.8rem 1rem 0.8rem 3rem; }
    .filter-box select { background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 0.8rem; min-width: 150px; }

    .table-container { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
    .bondin-styled-table { width: 100%; border-collapse: collapse; }
    .bondin-styled-table th { padding: 1.2rem; text-align: left; background: var(--surface-secondary); color: var(--gold); font-family: var(--font-ui); text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.1em; border-bottom: 1px solid var(--border); }
    .user-row { border-bottom: 1px solid var(--border); transition: 0.2s; }
    .user-row:hover { background: rgba(184, 136, 42, 0.03); }
    .user-row td { padding: 1.2rem; }

    .user-info { display: flex; align-items: center; gap: 1rem; }
    .avatar { width: 40px; height: 40px; background: var(--surface-secondary); border: 1px solid var(--gold); color: var(--gold); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font-ui); font-weight: 700; font-size: 0.8rem; }
    .name-box { display: flex; flex-direction: column; }
    .user-name { font-family: var(--font-body); font-weight: 600; color: var(--text); }
    .user-id { font-size: 0.7rem; color: var(--text-muted); }

    .role-badge { font-family: var(--font-ui); font-size: 0.65rem; padding: 0.2rem 0.6rem; border-radius: 2px; letter-spacing: 0.05em; font-weight: 600; }
    .role-badge.ADMIN { background: rgba(192, 40, 31, 0.1); color: #ff5247; border: 1px solid rgba(192, 40, 31, 0.2); }
    .role-badge.RH { background: rgba(184, 136, 42, 0.1); color: #ffc44d; border: 1px solid rgba(184, 136, 42, 0.2); }
    .role-badge.IT { background: rgba(26, 115, 232, 0.1); color: #64b5f6; border: 1px solid rgba(26, 115, 232, 0.2); }
    .role-badge.EMPLOYE { background: rgba(160, 152, 138, 0.1); color: var(--text-muted); border: 1px solid rgba(160, 152, 138, 0.2); }

    .status-badge { font-size: 0.65rem; font-weight: 700; }
    .status-badge.active { color: #4caf50; }
    .status-badge.revoked { color: var(--red); opacity: 0.6; }

    .btn-revoke:hover { background: var(--red); color: white; }
    .status-badge.offline { color: var(--text-muted); opacity: 0.6; }


    .text-right { text-align: right; }
    .text-muted { color: var(--text-muted); }
    .empty-state { padding: 4rem; text-align: center; color: var(--text-muted); }

    /* Stats Styling */
    .stats-overview { margin-bottom: 4rem; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 3rem; }
    .kpi-card { background: var(--surface); border: 1px solid var(--border); padding: 2rem; display: flex; flex-direction: column; position: relative; overflow: hidden; transition: 0.3s; }
    .kpi-card::after { content: ""; position: absolute; left: 0; top: 0; width: 3px; height: 100%; background: var(--gold); }
    .kpi-card.clickable { cursor: pointer; }
    .kpi-card.clickable:hover { border-color: var(--gold); transform: translateY(-3px); box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
    .active-kpi { border-color: var(--gold) !important; background: rgba(184, 136, 42, 0.05) !important; }

    .stats-detail-drawer {
      border-left: 4px solid var(--gold) !important;
      animation: slideDown 0.4s ease-out;
    }
    
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .kpi-label { font-family: var(--font-ui); font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; }
    .kpi-value { font-family: var(--font-display); font-size: 2.5rem; color: var(--gold); margin: 0.5rem 0; font-style: italic; }
    .kpi-trend { font-size: 0.7rem; color: var(--text-muted); opacity: 0.7; }

    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
    .stats-panel { background: var(--surface); border: 1px solid var(--border); padding: 2rem; }
    .stats-panel h3 { font-family: var(--font-display); font-style: italic; font-size: 1.4rem; color: var(--text); margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    
    .faq-item { display: flex; justify-content: space-between; padding: 0.8rem 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
    .clickable-item { cursor: pointer; transition: 0.2s; }
    .clickable-item:hover { background: rgba(184,136,42,0.05); padding-left: 5px; color: var(--gold); }
    .faq-name { font-size: 0.9rem; color: var(--text); }
    .faq-count { font-family: var(--font-ui); font-size: 0.8rem; color: var(--gold); }

    .progress-item { margin-bottom: 1.5rem; }
    .progress-info { display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.5rem; font-family: var(--font-ui); text-transform: uppercase; }
    .progress-bg { background: var(--surface-secondary); height: 6px; width: 100%; overflow: hidden; }
    .progress-fill { height: 100%; background: var(--gold); transition: 1s ease-out; }
    .progress-fill.red { background: var(--red); }
  `]
})
export class ManageUsers implements OnInit {
  users = signal<any[]>([]);
  stats = signal<any>(null);
  searchQuery = signal('');
  roleFilter = signal('ALL');
  showForm = signal(false);
  activeTab = signal<'ACTIVE' | 'OPEN' | 'RESOLVED' | 'RESPONSE_TIME' | null>(null);

  newUser = {
    nomUtilisateur: '',
    email: '',
    password: '',
    role: 'EMPLOYE'
  };

  filteredUsers = computed(() => {
    let list = this.users();
    const query = this.searchQuery().toLowerCase();
    const role = this.roleFilter();

    if (query) {
      list = list.filter(u => 
        (u.nomUtilisateur && u.nomUtilisateur.toLowerCase().includes(query)) || 
        (u.email && u.email.toLowerCase().includes(query))
      );
    }

    if (role !== 'ALL') {
      list = list.filter(u => u.role === role);
    }

    return list;
  });

  constructor(private http: HttpClient, public auth: Auth) {}

  ngOnInit() { 
    this.loadUsers(); 
    this.loadStats();
  }

  loadUsers() {
    this.http.get<any[]>('http://localhost:8080/api/admin/users').subscribe({
      next: (data) => this.users.set(data),
      error: (err) => console.error('Erreur chargement utilisateurs', err)
    });
  }

  loadStats() {
    this.http.get<any>('http://localhost:8080/api/admin/users/stats').subscribe({
      next: (data) => this.stats.set(data),
      error: (err) => console.error('Erreur chargement stats', err)
    });
  }

  toggleForm() {
    this.showForm.update(v => !v);
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
      error: (err) => {
        alert(err.error?.message || 'Erreur lors de l’intégration du collaborateur.');
      }
    });
  }

  revokeUser(user: any) {
    if (confirm(`Êtes-vous sûr de vouloir révoquer l'accès de ${user.nomUtilisateur} ?`)) {
      this.http.delete(`http://localhost:8080/api/admin/users/${user.id}`).subscribe({
        next: () => {
          // Mise à jour instantanée du signal local sans recharger toute la liste
          this.users.update(list => list.map(u => u.id === user.id ? { ...u, status: 'REVOKED' } : u));
        },
        error: (err) => alert('Erreur lors de la révocation.')
      });
    }
  }

  isOnline(user: any): boolean {
    if (!user.lastLogin || user.status === 'REVOKED') return false;
    const lastLoginDate = new Date(user.lastLogin);
    const now = new Date();
    // Considéré actif si connecté il y a moins de 5 minutes
    const diffInMinutes = (now.getTime() - lastLoginDate.getTime()) / (1000 * 60);
    return diffInMinutes < 5;
  }

  getStatusKey(user: any): string {
    if (user.status === 'REVOKED') return 'ADMIN.REVOKED';
    return this.isOnline(user) ? 'ADMIN.ACTIVE' : 'ADMIN.OFFLINE';
  }

  getInitials(name: string): string {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
}
