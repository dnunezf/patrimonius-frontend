import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf } from '@angular/common';
import { NotificationsStore } from '../../../shared/state/notifications.store';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgIf],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css'],
})
export class TopbarComponent {
  private readonly store = inject(NotificationsStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly noticeCount = computed(() => this.store.count());

  readonly userEmail = computed(() => this.auth.currentUser()?.email ?? '');
  readonly userRol = computed(() => {
    const user = this.auth.currentUser();
    return user?.rolId === 1 ? 'Administrador' : 'Usuario';
  });

  signOut(): void {
    this.auth.logout();
    this.router.navigate(['/']); // redirige a inicio o login
  }
}
