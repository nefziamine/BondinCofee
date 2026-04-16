import { TranslateModule } from '@ngx-translate/core';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, TranslateModule],
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  forgotForm: FormGroup;
  loading = false;
  message = '';
  isError = false;

  constructor(private fb: FormBuilder, private authService: Auth) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  onSubmit() {
    if (this.forgotForm.invalid) return;
    this.loading = true;
    this.authService.forgotPassword(this.forgotForm.value).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.message = res.message;
        this.isError = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.message = 'Une erreur est survenue';
        this.isError = true;
      }
    });
  }
}
