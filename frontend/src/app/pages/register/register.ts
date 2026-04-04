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
  styleUrl: './register.css',
})
export class Register {
    registerForm: FormGroup;
  submitted = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      nomUtlisateur: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      motDePasse: ['', [Validators.required, Validators.minLength(6)]],
      role: ['', Validators.required]
    });
  }

  onSubmit() {
    this.submitted = true;

    if (this.registerForm.invalid) return;

    this.http.post<any>('http://localhost:8080/api/auth/register', this.registerForm.value)
      .subscribe({
        next: (res) => {
          alert('Inscription réussie ! Vous pouvez maintenant vous connecter.');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.errorMessage = err.error?.message || "Erreur d'inscription";
        }
      });
  }

}
