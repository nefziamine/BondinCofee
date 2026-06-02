import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Auth } from '../../services/auth';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, TranslateModule],
  selector: 'app-change-password',
  templateUrl: './change-password.html',
  styleUrl: './change-password.scss'
})
export class ChangePassword {
  form: FormGroup;
  loading = false;
  message = '';
  isError = false;

  constructor(private fb: FormBuilder, private authService: Auth) {
    this.form = this.fb.group({
      oldPassword: ['', [Validators.required, Validators.minLength(4)]],
      newPassword: ['', [Validators.required, Validators.minLength(4)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    const { oldPassword, newPassword, confirmPassword } = this.form.value;
    if (newPassword !== confirmPassword) {
      this.isError = true;
      this.message = 'Passwords do not match.';
      return;
    }

    this.loading = true;
    this.authService.changePassword({ oldPassword, newPassword }).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.isError = false;
        this.message = res?.message || 'Password updated.';
        this.form.reset();
      },
      error: (err: any) => {
        this.loading = false;
        this.isError = true;
        this.message = err?.error?.message || 'Unable to change password.';
      }
    });
  }
}

