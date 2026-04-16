
import { Component, OnInit } from '@angular/core';
import { ProfileService, ProfilUser } from '../services/profile-service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-profile-view',
   imports: [CommonModule, ReactiveFormsModule, HttpClientModule,FormsModule, RouterModule, TranslateModule],
  templateUrl: './profile-view.html',
})
export class ProfileViewComponent implements OnInit {
  profile = signal<ProfilUser | null>(null);
  newProfile: ProfilUser = {} as ProfilUser;
  isProfileComplete = signal<boolean>(false);
  isEditing = signal<boolean>(false);

  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;

  constructor(
    private profileService: ProfileService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  // Charger le profil depuis le backend
  loadProfile(): void {
    const userId = Number(localStorage.getItem('userId'));
    this.profileService.getProfile(userId).subscribe({
      next: (res) => {
        if (res && res.nomComplet) {
          this.profile.set(res); // Profil existant
          this.isProfileComplete.set(true); // Switch strictly on data presence
        } else {
          this.isProfileComplete.set(false);
          this.profile.set(null);
        }
      },
      error: (err) => console.error('Erreur lors du chargement du profil :', err)
    });
  }

  // Création d’un nouveau profil
  createProfile(): void {
    if (!this.newProfile.nomComplet || !this.newProfile.email) {
      alert("Veuillez remplir les informations obligatoires.");
      return;
    }

    this.newProfile.userId = Number(localStorage.getItem('userId'));
    this.profileService.saveProfile(this.newProfile).subscribe({
      next: (res) => {
        this.profile.set(res); // Profil créé
        this.isProfileComplete.set(true); // Toggle AFTER server success
        this.isEditing.set(false); // Close edit mode
        this.newProfile = {} as ProfilUser; // Réinitialiser formulaire
        
        this.translate.get('PROF.SUCCESS_PROFILE').subscribe(msg => alert(msg));
      },
      error: (err) => console.error('Erreur lors de la création du profil :', err)
    });
  }

  // Sélection de l'image (Preview uniquement)
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedImageFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // Upload d’image effectif
  saveImage(): void {
    const userId = Number(localStorage.getItem('userId'));
    if (this.selectedImageFile && this.profile()) {
      this.profileService.uploadImage(this.selectedImageFile, userId).subscribe({
        next: (response) => {
          const current = this.profile();
          if (current) {
              this.profile.set({ ...current, imageurl: response.url }); 
          }
          this.cancelImageEdit(); // Reset local state
          
          this.translate.get('PROF.SUCCESS_IMAGE').subscribe(msg => alert(msg));
        },
        error: (err) => console.error('Erreur lors de l\'upload de l\'image :', err)
      });
    }
  }

  cancelImageEdit(): void {
    this.selectedImageFile = null;
    this.imagePreviewUrl = null;
  }
}