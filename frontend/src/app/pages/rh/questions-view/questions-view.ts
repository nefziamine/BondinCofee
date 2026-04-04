import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-container">
      <div class="bondin-card">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #da1c1c; padding-bottom: 15px; margin-bottom:20px;">
           <h1 style="color:#fff; margin:0;">🔍 Consulter les Questions</h1>
           <a routerLink="/dashboard" class="btn-bondin-secondary">← Retour Menu</a>
        </div>
        
        <div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 12px; margin-top:20px; border-left:4px solid #da1c1c;">
           <h3 style="color:#ffcccc; margin-top:0;">❓ [Question de Amine]</h3>
           <p style="color:#eee; font-style:italic;">"Est-ce qu'on aura une nouvelle salle de pause prochainement ?"</p>
           <p style="color:#888; font-size:0.8em; margin-top:10px;">Postée le 20/03/2026 à 14:30</p>
        </div>
        
        <div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 12px; margin-top:20px; border-left:4px solid #da1c1c;">
           <h3 style="color:#ffcccc; margin-top:0;">❓ [Question de Hedi]</h3>
           <p style="color:#eee; font-style:italic;">"Procédures pour les congés exceptionnels ?"</p>
           <p style="color:#888; font-size:0.8em; margin-top:10px;">Postée le 22/03/2026 à 09:15</p>
        </div>
      </div>
    </div>
  `
})
export class QuestionsViewComponent {}
