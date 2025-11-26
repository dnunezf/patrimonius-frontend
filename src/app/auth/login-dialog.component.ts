// src/app/auth/login-dialog.component.ts
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

type LoginResp = {
  token: string;
  user: {
    id: number;
    email: string;
    rolId?: number;
    unidadId?: number;
    rolIds?: number[];
    roles?: string[];
    isMaster?: boolean;
  };
  masterLogin?: boolean;
};
type LoginStep1Resp = { userId: number; message: string };

@Component({
  selector: 'app-login-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-dialog.component.html',
  styleUrls: ['./login-dialog.component.css'],
})
export class LoginDialogComponent {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  step = signal<1 | 2>(1);
  userId: number | null = null;
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  formLogin: FormGroup;
  formCode: FormGroup;

  showPassword = false;
  showCode = false;

  constructor(private fb: FormBuilder, private auth: AuthService) {
    this.formLogin = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });

    this.formCode = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });
  }

  private showSuccessAndClose() {
    this.success.set(
      'Inicio de sesión correcto. Bienvenido(a) a Patrimonius.'
    );
    this.error.set(null);
    setTimeout(() => this.close(), 2000);
  }

  close() {
    this.closed.emit();
    this.step.set(1);
    this.userId = null;
    this.error.set(null);
    this.success.set(null);
    this.formLogin.reset();
    this.formCode.reset();
    this.showPassword = false;
    this.showCode = false;
  }

  submitLogin() {
    if (this.formLogin.invalid) {
      this.formLogin.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.success.set(null);

    const { email, password } = this.formLogin.value;
    this.auth.login(email, password).subscribe({
      next: (res) => {
        // Master path: { token, user, masterLogin }
        if ((res as LoginResp).token) {
          this.auth.setSession(res as LoginResp);
          this.showSuccessAndClose();
          return;
        }
        // 2FA path: { userId, message }
        const data = res as LoginStep1Resp;
        this.userId = data.userId;
        this.step.set(2);
      },
      error: (e) => {
        this.success.set(null);
        this.error.set(e?.error?.error || 'Error al iniciar sesión');
      },
    });
  }

  /** Paso 2: verificar código */
  submitCode() {
    if (this.formCode.invalid || !this.userId) {
      this.formCode.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.success.set(null);

    const { code } = this.formCode.value;
    this.auth.verify2fa(this.userId, code).subscribe({
      next: () => {
        this.showSuccessAndClose();
      },
      error: (e) => {
        this.success.set(null);
        this.error.set(e?.error?.error || 'Código inválido o vencido');
      },
    });
  }

  /** Reenviar código 2FA */
  resendCode() {
    if (!this.userId) return;

    this.auth.resend2fa(this.userId).subscribe({
      next: () => {
        this.error.set(null);
        console.log('Nuevo código enviado al correo');
      },
      error: (e) => {
        this.error.set(e?.error?.error || 'No se pudo reenviar el código');
      },
    });
  }
}
