import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProfileService, ProfilUser } from '../services/profile-service';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-create-profile',
  templateUrl: './create-profile.html',
   imports: [CommonModule, ReactiveFormsModule, HttpClientModule, RouterModule],
  styleUrls: ['./create-profile.css'], // corrige styleUrl -> styleUrls
})
export class CreateProfileComponent {
  profileForm: FormGroup;

  constructor(private fb: FormBuilder, private profileService: ProfileService) {
    // Initialisation du formulaire avec les champs exacts de ton entity
    this.profileForm = this.fb.group({
      nomComplet: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      department: ['', Validators.required],
      poste: ['', Validators.required],
      telephone: ['', Validators.required],
      experience: ['', Validators.required],
      imageurl: [''] // facultatif, peut être rempli après upload
    });
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    const profile: ProfilUser = {
      ...this.profileForm.value,
      userId: Number(localStorage.getItem('userId')) // Assurez-vous de stocker l'ID user après login
    };

    this.profileService.saveProfile(profile).subscribe({
      next: (res) => {
        alert('Profil créé avec succès !');
        this.profileForm.reset();
      },
      error: (err) => {
        console.error(err);
        alert('Erreur lors de la création du profil');
      }
    });
  }
}