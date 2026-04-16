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
           <h1 style="color:#fff; margin:0;">👁️ Supervision Systèmes</h1>
           <a routerLink="/dashboard" class="btn-bondin-secondary">← Retour Menu</a>
        </div>
        
        <div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 12px; margin-top:20px;">
           <h3 style="color:#ffcccc; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:10px;">📊 Statistiques en Temps Réel</h3>
           <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:20px; text-align:center; margin-top:20px;">
              <div style="background:rgba(255,255,255,0.03); padding:20px; border-radius:10px;">
                 <h2 style="color:#da1c1c; margin:0;">98.4%</h2>
                 <p style="font-size:0.8em; color:#aaa; margin-top:5px;">Disponibilité</p>
              </div>
              <div style="background:rgba(255,255,255,0.03); padding:20px; border-radius:10px;">
                 <h2 style="color:#da1c1c; margin:0;">124ms</h2>
                 <p style="font-size:0.8em; color:#aaa; margin-top:5px;">Temps de réponse</p>
              </div>
              <div style="background:rgba(255,255,255,0.03); padding:20px; border-radius:10px;">
                 <h2 style="color:#da1c1c; margin:0;">420</h2>
                 <p style="font-size:0.8em; color:#aaa; margin-top:5px;">Requêtes API / min</p>
              </div>
           </div>
           
           <h3 style="color:#ffcccc; margin-top:40px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:10px;">💾 Mémoire PostgreSQL</h3>
           <p style="color:#888; font-size:0.9em;">Capacité utilisée : 1.2 GB / 50 GB</p>
           <div style="height:10px; background:rgba(255,255,255,0.05); border-radius:5px; margin-top:10px;">
              <div style="height:100%; width:15%; background:#da1c1c; border-radius:5px;"></div>
           </div>
        </div>
      </div>
    </div>
  `
})
export class SupervisionComponent {}
