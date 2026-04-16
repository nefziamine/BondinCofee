import { TranslateModule } from '@ngx-translate/core';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  template: `
    <div class="page-container">
      <div class="bondin-card">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #da1c1c; padding-bottom: 15px; margin-bottom:20px;">
           <h1 style="color:#fff; margin:0;">🐛 Rapports de Bugs</h1>
           <a routerLink="/dashboard" class="btn-bondin-secondary">← Retour Menu</a>
        </div>
        
        <table class="bondin-table">
            <thead>
              <tr>
                <th>Sévérité</th>
                <th>Module</th>
                <th>Description</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>🔴 <span style="background:rgba(218,28,28,0.2); padding:3px 8px; border-radius:4px; font-size:0.8em;">CRITIQUE</span></td>
                <td>Authentification</td>
                <td style="font-size:0.9em;">Échec de redirection après login Admin</td>
                <td><button class="btn-bondin" style="font-size:0.7em; padding:6px 10px;">Résoudre</button></td>
              </tr>
              <tr>
                <td>🟡 <span style="background:rgba(255,193,7,0.2); color:#ffc107; padding:3px 8px; border-radius:4px; font-size:0.8em;">MINEUR</span></td>
                <td>UI Design</td>
                <td style="font-size:0.9em;">Alignement logo Bondin sur Dashboard mobile</td>
                <td><button class="btn-bondin" style="font-size:0.7em; padding:6px 10px;">En cours</button></td>
              </tr>
            </tbody>
        </table>
        
        <p style="text-align:center; color:#888; margin-top:30px;">Aucun autre bug signalé.</p>
      </div>
    </div>
  `
})
export class BugsComponent {}
