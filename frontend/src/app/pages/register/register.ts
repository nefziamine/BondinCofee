import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
    registerForm: FormGroup;
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['EMPLOYEE', Validators.required] // Default for new registrations
    });
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    // Map frontend 'fullName' to backend 'nomUtilisateur'
    const payload = {
      ...this.registerForm.value,
      nomUtilisateur: this.registerForm.value.fullName
    };

    this.http.post<any>('http://localhost:8080/api/auth/register', payload)
      .subscribe({
        next: (res) => {
          this.loading = false;
          alert('Inscription réussie ! Torréfaction en cours... Vous pouvez maintenant entrer dans la maison.');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.message || "Erreur lors de l'accès à la maison.";
        }
      });
  }

}
