import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

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
  @Output() submitLogin = new EventEmitter<{ email: string; password: string }>();
  @Output() forgot = new EventEmitter<void>();

  showPassword = signal(false);
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  onBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal')) this.close();
  }

  close() { this.closed.emit(); }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitLogin.emit(this.form.value);
  }
}
