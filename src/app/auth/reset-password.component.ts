import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIf],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
})
export class ResetPasswordComponent {
  form: FormGroup;
  token: string | null = null;
  message: string | null = null;
  error: string | null = null;

  showPassword = false;
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService
  ) {
    this.form = this.fb.group({
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          this.passwordPolicyValidator,
        ],
      ],
    });

    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.error = 'El enlace de restablecimiento no es válido o ha expirado.';
    }
  }

  get passwordCtrl(): AbstractControl | null {
    return this.form.get('password');
  }

  get passwordValue(): string {
    return (this.passwordCtrl?.value as string) || '';
  }

  get hasMinLength(): boolean {
    return this.passwordValue.length >= 8;
  }

  get hasLetter(): boolean {
    return /[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(this.passwordValue);
  }

  get hasNumber(): boolean {
    return /\d/.test(this.passwordValue);
  }

  get hasSymbol(): boolean {
    return /[^A-Za-z0-9]/.test(this.passwordValue);
  }

  passwordPolicyValidator(control: AbstractControl): ValidationErrors | null {
    const value = (control.value as string) || '';

    const lengthOk = value.length >= 8;
    const letterOk = /[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(value);
    const numberOk = /\d/.test(value);
    const symbolOk = /[^A-Za-z0-9]/.test(value);

    return lengthOk && letterOk && numberOk && symbolOk
      ? null
      : { weakPassword: true };
  }

  submit() {
    this.submitted = true;
    this.error = null;
    this.message = null;

    if (!this.token) {
      this.error = 'El enlace de restablecimiento no es válido o ha expirado.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error =
        'La contraseña no cumple con los requisitos de seguridad indicados.';
      return;
    }

    const password = this.passwordValue;

    this.auth.resetPassword(this.token, password).subscribe({
      next: (res) => {
        this.message =
          res.message ||
          'Su contraseña ha sido restablecida correctamente. Será redirigido al inicio para iniciar sesión con su nueva contraseña.';
        setTimeout(
          () => this.router.navigate(['/'], { queryParams: { login: 1 } }),
          2000
        );
      },
      error: (err) => {
        const code = err?.error?.error;

        if (code === 'invalid_token' || code === 'invalid_or_expired') {
          this.error =
            'El enlace de restablecimiento no es válido o ha expirado. Por favor genere una nueva solicitud desde “Olvidó su contraseña”.';
        } else {
          this.error =
            'Se produjo un error al restablecer la contraseña. Por favor, intente de nuevo o contacte al administrador del sistema.';
        }
      },
    });
  }
}
