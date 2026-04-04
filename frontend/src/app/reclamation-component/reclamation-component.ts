import { Component, OnInit } from '@angular/core';
import { Reclamation } from '../Model/Reclamation';
import { ReclamationService } from '../services/reclamation-service';
import { Auth } from '../services/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-reclamation-component',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './reclamation-component.html',
  styleUrl: './reclamation-component.css',
})
export class ReclamationComponent implements OnInit {
  reclamations: Reclamation[] = [];
  userRole: string | null = '';

  newReclamation: Reclamation = {
    sujet: '',
    description: '',
    status: 'EN_ATTENTE'
  };

  constructor(
    private reclamationService: ReclamationService, 
    private authService: Auth
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRole();
    this.loadReclamations();
  }

  loadReclamations() {
    this.reclamationService.getAll().subscribe(data => {
      this.reclamations = data;
    });
  }

  addReclamation() {
    const reclamationToSend = {
      ...this.newReclamation,
      dateCreation: new Date()
    };

    this.reclamationService.add(reclamationToSend).subscribe(() => {
      this.loadReclamations();
      this.newReclamation = { sujet:'', description:'', status:'EN_ATTENTE' };
    });
  }

  deleteReclamation(id:number) {
    this.reclamationService.delete(id).subscribe(()=>{
      this.loadReclamations();
    });
  }
}
