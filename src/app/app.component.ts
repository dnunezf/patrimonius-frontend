import {Component, signal} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavComponent } from './core/nav/nav.component';
import { LoginDialogComponent } from './auth/login-dialog.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavComponent, LoginDialogComponent],
  template: `
    <app-nav
      [brandTitle]="'Patrimonius'"
      [brandSubtitle]="'Museo Nacional de Costa Rica'"
      [logo]="'assets/logos/logo.png'"
      [loginItem]="{ label: 'Iniciar Sesión', path: '/login' }"
      (loginClick)="openLogin()">
    </app-nav>

    <router-outlet></router-outlet>

  <app-login-dialog
    [open]="loginOpen()"
  (closed)="closeLogin()">
    </app-login-dialog>
      `,
})

export class AppComponent {
  constructor(private router: Router) {}



  // estado del modal
  loginOpen = signal(false);

  openLogin()  { this.loginOpen.set(true); }
  closeLogin() { this.loginOpen.set(false); }
}
