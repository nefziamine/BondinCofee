
import { Component, OnInit } from '@angular/core';
import { ProfileService, ProfilUser } from '../services/profile-service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-profile-view',
   imports: [CommonModule, ReactiveFormsModule, HttpClientModule,FormsModule, RouterModule],
  templateUrl: './profile-view.html',
})
export class ProfileViewComponent implements OnInit {
    profile: ProfilUser | null = null;
  newProfile: ProfilUser = {} as ProfilUser;

  constructor(private profileService: ProfileService) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  // Charger le profil depuis le backend
  loadProfile(): void {
    this.profileService.getProfile().subscribe({
      next: (res) => {
        if (res) {
          this.profile = res; // Profil existant
        }
      },
      error: (err) => console.error('Erreur lors du chargement du profil :', err)
    });
  }

  // Création d’un nouveau profil
  createProfile(): void {
    this.profileService.saveProfile(this.newProfile).subscribe({
      next: (res) => {
        this.profile = res; // Profil créé et affiché
        this.newProfile = {} as ProfilUser; // Réinitialiser formulaire
      },
      error: (err) => console.error('Erreur lors de la création du profil :', err)
    });
  }

  // Upload d’image
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file && this.profile) {
      this.profileService.uploadImage(file).subscribe({
        next: (imageUrl) => this.profile!.imageurl = imageUrl,
        error: (err) => console.error('Erreur lors de l\'upload de l\'image :', err)
      });
    }
  }
}