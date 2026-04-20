import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

import { NavComponent } from './core/nav/nav.component';
import { LoginDialogComponent } from './auth/login-dialog.component';
import { ConfirmDialogComponent } from './shared/ui/confirm-dialog.component';
import { ToastContainerComponent } from './shared/ui/toast-container.component';
import{AuthService} from '../core/services/auth.service';

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

    <app-confirm-dialog></app-confirm-dialog>
    <app-toast-container></app-toast-container>

    <div
      class="session-warning-backdrop"
      *ngIf="auth.sessionWarningVisible()"
    >
      <div class="session-warning-modal">
        <h3>La sesión está por vencer</h3>

        <p *ngIf="!auth.longRunningProcessActive()">
          Su sesión vencerá en {{ auth.sessionSecondsRemaining() }} segundos.
          ¿Desea continuar con la sesión activa?
        </p>

        <p *ngIf="auth.longRunningProcessActive()">
          Su sesión vencerá en {{ auth.sessionSecondsRemaining() }} segundos.
          Hay un proceso en curso. Si desea continuar con la sesión activa para no interrumpirlo,
          seleccione “Continuar”.
        </p>

        <div class="session-warning-error" *ngIf="refreshError()">
          {{ refreshError() }}
        </div>

        <div class="session-warning-actions">
          <button
            type="button"
            class="session-warning-btn session-warning-btn--secondary"
            (click)="logout()"
            [disabled]="refreshing()"
          >
            Cerrar sesión
          </button>

          <button
            type="button"
            class="session-warning-btn session-warning-btn--primary"
            (click)="continueSession()"
            [disabled]="refreshing()"
          >
            {{ refreshing() ? 'Renovando...' : 'Continuar' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .session-warning-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.45);
        display: grid;
        place-items: center;
        z-index: 9999;
        padding: 16px;
      }

      .session-warning-modal {
        width: min(460px, calc(100vw - 32px));
        background: #fff;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2);
      }

      .session-warning-modal h3 {
        margin: 0 0 12px;
        color: #0f172a;
        font-size: 1.2rem;
      }

      .session-warning-modal p {
        margin: 0;
        color: #475569;
        line-height: 1.5;
      }

      .session-warning-error {
        margin-top: 12px;
        color: #b91c1c;
        font-size: 0.9rem;
      }

      .session-warning-actions {
        margin-top: 20px;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        flex-wrap: wrap;
      }

      .session-warning-btn {
        border: 0;
        border-radius: 10px;
        padding: 10px 16px;
        font-weight: 700;
        cursor: pointer;
      }

      .session-warning-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      .session-warning-btn--secondary {
        background: #e5e7eb;
        color: #111827;
      }

      .session-warning-btn--primary {
        background: #0b5bd3;
        color: #fff;
      }
    `,
  ],
})
export class AppComponent {
  private router = inject(Router);
  auth = inject(AuthService);

  loginOpen = signal(false);
  refreshing = signal(false);
  refreshError = signal('');

  constructor() {
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

  continueSession(): void {
    this.refreshing.set(true);
    this.refreshError.set('');

    this.auth.continueSession().subscribe({
      next: () => {
        this.refreshing.set(false);
      },
      error: () => {
        this.refreshing.set(false);
        this.refreshError.set(
          'No fue posible renovar la sesión. Por favor inicie sesión nuevamente.'
        );
      },
    });
  }

  logout(): void {
    this.auth.logout();
  }
}
