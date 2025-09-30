// src/app/auth/login-dialog.component.ts
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-dialog.component.html',
  styleUrls: ['./login-dialog.component.css']
})
export class LoginDialogComponent {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  step = signal<1 | 2>(1);
  userId: number | null = null;
  error = signal<string | null>(null);

  formLogin: FormGroup;
  formCode: FormGroup;

  constructor(private fb: FormBuilder, private auth: AuthService) {
    this.formLogin = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });

    this.formCode = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
  }

  close() {
    this.closed.emit();
    this.step.set(1);
    this.userId = null;
    this.error.set(null);
    this.formLogin.reset();
    this.formCode.reset();
  }

  /** Paso 1: login */
  submitLogin() {
    if (this.formLogin.invalid) {
      this.formLogin.markAllAsTouched();
      return;
    }

    const { email, password } = this.formLogin.value;
    this.auth.login(email, password).subscribe({
      next: (res) => {
        this.userId = res.userId;
        this.step.set(2);
      },
      error: (e) => {
        this.error.set(e?.error?.error || 'Error al iniciar sesión');
      }
    });
  }

  /** Paso 2: verificar código */
  submitCode() {
    if (this.formCode.invalid || !this.userId) {
      this.formCode.markAllAsTouched();
      return;
    }

    const { code } = this.formCode.value;
    this.auth.verify2fa(this.userId, code).subscribe({
      next: () => {
        this.close();
      },
      error: (e) => {
        this.error.set(e?.error?.error || 'Código inválido o vencido');
      }
    });
  }
}
