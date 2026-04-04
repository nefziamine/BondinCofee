import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ask-question',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="bondin-card" style="max-width: 800px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #da1c1c; padding-bottom: 15px; margin-bottom:20px;">
           <h1 style="color:#fff; margin:0;">❓ Poser une Question</h1>
           <a routerLink="/dashboard" class="btn-bondin-secondary">← Retour Menu</a>
        </div>

        <div style="background: rgba(0,0,0,0.3); padding: 25px; border-radius: 12px;">
           <h3 style="color:#ffcccc; margin-top:0;">Quelle est votre interrogation ?</h3>
           <input type="text" class="bondin-input" placeholder="Sujet de la question..." [(ngModel)]="subject">
           <textarea class="bondin-textarea" placeholder="Détaillez votre question ici..." rows="5" [(ngModel)]="content"></textarea>
           
           <button class="btn-bondin" (click)="submit()">Envoyer la question</button>
        </div>
      </div>
    </div>
  `
})
export class AskQuestion {
  subject: string = '';
  content: string = '';
  submit() {
    alert('Votre question a été envoyée avec succès aux équipes concernées.');
    this.subject = '';
    this.content = '';
  }
}
