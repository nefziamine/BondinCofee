import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-note',
  templateUrl: './note.html',
  styleUrl: './note.scss'
})
export class NotePage {
  content: string = `- Confirmer politique interne applicable.
- Donner une réponse claire + délai.
- Prévoir suivi et clôture officielle.`;

  send(){
    console.log('Envoyer:', this.content);
    alert('Note envoyée (voir console)');
  }

  cancel(){
    this.content = '';
  }
}
