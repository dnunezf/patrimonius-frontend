import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopbarComponent } from '../../core/layout/topbar/topbar.component';
import { ToastContainerComponent } from '../../shared/ui/toast-container.component';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog.component';

/** Admin shell hosting topbar, router outlet and global UI helpers (toasts/confirm). */
@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    TopbarComponent,
    ToastContainerComponent,
    ConfirmDialogComponent,
  ],
  template: `
    <app-topbar></app-topbar>
    <router-outlet></router-outlet>

    <!-- Global helpers -->
    <app-toast-container></app-toast-container>
    <app-confirm-dialog></app-confirm-dialog>
  `,
})
export class AdminShellComponent {}
