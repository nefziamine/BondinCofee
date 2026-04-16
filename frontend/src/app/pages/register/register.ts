import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { finalize, timeout } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, TranslateModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
    registerForm: FormGroup;
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['EMPLOYE', Validators.required] 
    });
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    if (this.loading) return; // Prevent double submit

    this.loading = true;
    this.errorMessage = '';
    const payload = {
      ...this.registerForm.value,
      nomUtilisateur: this.registerForm.value.fullName
    };

    this.authService.register(payload)
      .pipe(
        timeout(10000), // Stop hanging after 10s
        finalize(() => this.loading = false) // ALWAYS reset loading
      )
      .subscribe({
        next: (res) => {
          if (res.message === 'Registered successfully') {
            alert('Inscription réussie ! Torréfaction en cours... Vous pouvez maintenant entrer dans la maison.');
            this.router.navigate(['/login'], { queryParams: { welcome: 'true' } });
          } else {
            this.errorMessage = res.message;
          }
        },
        error: (err) => {
          if (err.name === 'TimeoutError') {
            this.errorMessage = "La Maison Bondin ne répond pas (Délai d'attente dépassé).";
          } else if (err.status === 0) {
            this.errorMessage = "Le serveur est hors ligne. Veuillez démarrer le backend.";
          } else {
            this.errorMessage = err.error?.message || "Erreur lors de l'inscription.";
          }
        }
      });
  }
}
