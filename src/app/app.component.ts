import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

import { NavComponent } from './core/nav/nav.component';
import { LoginDialogComponent } from './auth/login-dialog.component';
import { ConfirmDialogComponent } from './shared/ui/confirm-dialog.component';
import { ToastContainerComponent } from './shared/ui/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavComponent,
    LoginDialogComponent,
    ConfirmDialogComponent,
    ToastContainerComponent,
  ],
  template: `
    <app-nav
      [brandTitle]="'Patrimonius'"
      [brandSubtitle]="'Museo Nacional de Costa Rica'"
      [logo]="'assets/logos/logo.png'"
      [loginItem]="{ label: 'Iniciar Sesión', path: '/login' }"
      (loginClick)="openLogin()"
    >
    </app-nav>

    <router-outlet></router-outlet>

    <app-login-dialog [open]="loginOpen()" (closed)="closeLogin()">
    </app-login-dialog>

    <!-- Global reusable UI -->
    <app-confirm-dialog></app-confirm-dialog>
    <app-toast-container></app-toast-container>
  `,
})
export class AppComponent {
  loginOpen = signal(false);

  constructor(private router: Router) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        const urlTree = this.router.parseUrl(this.router.url);
        const shouldOpenLogin = ['1', 'true'].includes(
          String(urlTree.queryParams['login'] ?? '').toLowerCase()
        );

        if (!shouldOpenLogin) return;

        this.openLogin();
        delete urlTree.queryParams['login'];
        this.router.navigateByUrl(urlTree, { replaceUrl: true });
      });
  }

  openLogin() {
    this.loginOpen.set(true);
  }

  closeLogin() {
    this.loginOpen.set(false);
  }
}
