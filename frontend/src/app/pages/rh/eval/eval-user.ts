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
           <h1 style="color:#fff; margin:0;">📋 Évaluation Collaborateurs</h1>
           <a routerLink="/dashboard" class="btn-bondin-secondary">← Retour Menu</a>
        </div>
        
        <div style="background: rgba(0,0,0,0.3); padding: 25px; border-radius: 12px;">
           <h3 style="color:#ffcccc;">Sélectionner un utilisateur à évaluer :</h3>
           <div style="display:flex; flex-direction:column; gap:10px;">
              <div style="padding:15px; background:rgba(255,107,107,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:10px; display:flex; justify-content:space-between; align-items:center;">
                 <span>Amine Nefzi (Employé)</span>
                 <button class="btn-bondin" style="width:auto; padding:5px 15px; font-size:0.8em;" onclick="alert('Lancement de la grille d\'évaluation...')">Évaluer</button>
              </div>
              <div style="padding:15px; background:rgba(255,107,107,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:10px; display:flex; justify-content:space-between; align-items:center;">
                 <span>Hedi Ben Salem (Employé)</span>
                 <button class="btn-bondin" style="width:auto; padding:5px 15px; font-size:0.8em;" onclick="alert('Lancement de la grille d\'évaluation...')">Évaluer</button>
              </div>
           </div>
        </div>
      </div>
    </div>
  `
})
export class EvalUserComponent {}
