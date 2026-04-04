import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-manage-permissions',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-container">
      <div class="bondin-card" style="max-width: 800px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #da1c1c; padding-bottom: 15px; margin-bottom:20px;">
           <h1 style="color:#fff; margin:0;">🔐 Gestion des Permissions</h1>
           <a routerLink="/dashboard" class="btn-bondin-secondary">← Retour Menu</a>
        </div>

        <div style="background: rgba(0,0,0,0.3); padding: 25px; border-radius: 12px;">
           <h3 style="color:#ffcccc; margin-top:0;">Paramètres de Sécurité par Rôle</h3>
           
           <table class="bondin-table">
            <thead>
              <tr>
                <th>Rôle</th>
                <th>Accès Dashboard</th>
                <th>Réclamations</th>
                <th>Profil</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>ADMIN</strong></td>
                <td>✅ Total</td>
                <td>👁️ Consulter</td>
                <td>✅ Activé</td>
              </tr>
              <tr>
                <td><strong>EMPLOYE</strong></td>
                <td>✅ Interne</td>
                <td>📝 Créer</td>
                <td>✅ Activé</td>
              </tr>
              <tr>
                <td><strong>IT</strong></td>
                <td>✅ Système</td>
                <td>👁️ Consulter</td>
                <td>✅ Activé</td>
              </tr>
            </tbody>
           </table>

           <p style="color:#aaa; font-style:italic; font-size:0.9em; margin-top:20px;">
             *Les modifications de permissions nécessitent une validation du SI.
           </p>
        </div>
      </div>
    </div>
  `
})
export class ManagePermissions {}
