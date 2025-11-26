import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule, NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIf],
  templateUrl: './reset-password-request.component.html',
  styleUrls: ['./reset-password-request.component.css'],
})
export class ResetPasswordRequestComponent {
  form: FormGroup;
  message: string | null = null;
  error: string | null = null;
  submitted = false;

  constructor(private fb: FormBuilder, private auth: AuthService) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  submit() {
    this.submitted = true;
    this.message = null;
    this.error = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Por favor ingrese una dirección de correo válida.';
      return;
    }

    const { email } = this.form.value;

    this.auth.requestPasswordReset(email).subscribe({
      next: (res) => {
        this.message = res.message;
        this.error = null;
      },
      error: () => {
        this.error =
          'Se produjo un error al procesar la solicitud. Por favor, intente de nuevo más tarde.';
      },
    });
  }
}
