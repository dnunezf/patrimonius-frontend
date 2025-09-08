import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth.service';
import { LoginDialogComponent } from '../app/auth/login-dialog.component';
import { NavComponent } from '../app/core/nav/nav.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, LoginDialogComponent, NavComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {


  open = signal(false);


  items = [
    { label: 'Inicio', path: '/' },
  ];

  constructor(public auth: AuthService) {}

  openLogin() { this.open.set(true); }

  onLoginSubmit({ email, password }: { email: string; password: string }) {
    this.auth.login(email, password).subscribe({
      next: (resp) => {
        this.auth.setSession(resp);
        this.open.set(false);
      },
      error: (e) => {
        console.error('Login error', e);

        alert(e?.error?.message || 'Credenciales inválidas.');
      }
    });
  }
}
