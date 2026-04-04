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
           <h1 style="color:#fff; margin:0;">🛠️ Maintenance Application</h1>
           <a routerLink="/dashboard" class="btn-bondin-secondary">← Retour Menu</a>
        </div>
        <div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 12px; text-align:center;">
           <h2 style="color:#ffcccc;">État des Services</h2>
           <p style="color:#eee;">La prochaine fenêtre de maintenance est prévue pour <strong>Samedi 03:00</strong>.</p>
           <div style="display:flex; justify-content:center; gap:20px; margin-top:30px;">
              <div style="padding:20px; background:rgba(46,125,50,0.2); border:1px solid #2e7d32; border-radius:10px; flex:1;">
                 <h4 style="margin:0; color:#4caf50;">Serveur API</h4>
                 <p style="font-size:0.8em; margin-top:5px;">Opérationnel</p>
              </div>
              <div style="padding:20px; background:rgba(46,125,50,0.2); border:1px solid #2e7d32; border-radius:10px; flex:1;">
                 <h4 style="margin:0; color:#4caf50;">Base de données</h4>
                 <p style="font-size:0.8em; margin-top:5px;">Connecté (PostgreSQL)</p>
              </div>
           </div>
           <button class="btn-bondin" style="margin-top:40px; width:auto;" onclick="alert('Lancement des vérifications...')">Lancer Check-up Système</button>
        </div>
      </div>
    </div>
  `
})
export class MaintenanceComponent {}
