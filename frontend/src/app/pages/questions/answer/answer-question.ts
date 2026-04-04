import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-answer-question',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="bondin-card" style="max-width: 900px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #da1c1c; padding-bottom: 15px; margin-bottom:20px;">
           <h1 style="color:#fff; margin:0;">💬 Répondre aux Questions</h1>
           <a routerLink="/dashboard" class="btn-bondin-secondary">← Retour Menu</a>
        </div>

        <div style="background: rgba(0,0,0,0.3); padding: 25px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #da1c1c;">
           <h4 style="color:#ffcccc; margin-top:0;">❓ [Question] Réorganisation du service IT</h4>
           <p style="color:#eee; font-style:italic;">"Quand est prévue la prochaine mise à jour du système interne ?"</p>
           
           <hr style="border:0.5px solid rgba(255,255,255,0.05); margin:15px 0;">
           
           <textarea class="bondin-textarea" placeholder="Votre réponse officielle..." rows="3" [(ngModel)]="answer"></textarea>
           <button class="btn-bondin" (click)="reply()">Publier la réponse</button>
        </div>

        <p *ngIf="!answer" style="text-align:center; color:#888;">Pas d'autres questions en attente pour le moment.</p>
      </div>
    </div>
  `
})
export class AnswerQuestion {
  answer: string = '';
  reply() {
    alert('Votre réponse a été publiée dans le flux partagé.');
    this.answer = '';
  }
}
