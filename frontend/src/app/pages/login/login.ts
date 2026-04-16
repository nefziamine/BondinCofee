import { TranslateModule } from '@ngx-translate/core';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth } from '../../services/auth';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, TranslateModule],
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
loginForm: FormGroup; // on déclare seulement
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Initialise le formulaire ici
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value)
      .subscribe({
        next: (res) => {
          this.loading = false;
          if (res.token) {
            if (this.route.snapshot.queryParams['welcome']) {
                alert("Bienvenue chez Maison Bondin ! Veuillez prendre un instant pour compléter votre profil.");
                this.router.navigate(['/afficherprofil']);
            }
          } else {
            this.errorMessage = res.message || 'Identifiants invalides';
          }
        },
        error: (err) => {
          this.loading = false;
          if (err.status === 0) {
            this.errorMessage = "Le serveur de la Maison Bondin est hors ligne. Veuillez démarrer le backend (Maven).";
          } else {
            this.errorMessage = 'Email ou mot de passe incorrect';
          }
          console.error(err);
        }
      });
  }

}
