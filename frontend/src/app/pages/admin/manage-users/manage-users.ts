import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule],
  template: `
    <div class="page-container">
      <div class="bondin-card">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #da1c1c; padding-bottom: 15px; margin-bottom:20px;">
           <h1 style="color:#fff; margin:0;">👥 Gestion des Utilisateurs</h1>
           <a routerLink="/dashboard" class="btn-bondin-secondary">← Retour Menu</a>
        </div>

        <table class="bondin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users">
              <td>#{{user.id}}</td>
              <td>{{user.nomUtilisateur}}</td>
              <td>{{user.email}}</td>
              <td><span style="background:rgba(255,255,255,0.1); padding:4px 8px; border-radius:4px; font-size:0.8em;">{{user.role}}</span></td>
              <td>
                <button (click)="deleteUser(user.id)" style="background:#da1c1c; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">Supprimer</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class ManageUsers implements OnInit {
  users: any[] = [];
  constructor(private http: HttpClient) {}
  ngOnInit() { this.loadUsers(); }
  loadUsers() {
    this.http.get<any[]>('http://localhost:8080/api/admin/users').subscribe(data => this.users = data);
  }
  deleteUser(id: number) {
    if(confirm('Supprimer cet utilisateur ?')) {
      this.http.delete('http://localhost:8080/api/admin/users/' + id).subscribe(() => this.loadUsers());
    }
  }
}
