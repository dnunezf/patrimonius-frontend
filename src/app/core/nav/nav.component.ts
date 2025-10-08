import { Component, Input, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NavItem } from './nav.types';
import { NotificationsStore } from '../../shared/state/notifications.store';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, NgIf, NgFor],
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.css']
})
export class NavComponent {
  @Input() brandTitle = 'Patrimonius';
  @Input() brandSubtitle = 'Museo Nacional de Costa Rica';
  @Input() logo = 'assets/logos/logo.png';

  private _items: NavItem[] = [];
  @Input() set items(value: NavItem[]) {
    this._items = (value || []).filter(
      it => (it.label ?? '').trim().toLowerCase() !== 'inicio' && it.path !== '/'
    );
  }
  get items(): NavItem[] { return this._items; }

  @Input() loginItem?: NavItem;
  @Output() loginClick = new EventEmitter<void>();

  // --- NUEVO: sesión / notificaciones ---
  private readonly auth = inject(AuthService);
  private readonly store = inject(NotificationsStore);
  private readonly router = inject(Router);

  private readonly currentUser = computed(() => this.auth.currentUser?.() ?? this.auth.currentUser?.() ?? this.auth.currentUser?.call?.(this.auth) ?? this.auth.currentUser?.()); // tolerante
  isLoggedIn = () => !!this.auth.currentUser?.();

  userEmail = () => this.auth.currentUser?.()?.email ?? '';


   roles(): string[] {
    const u = this.auth.currentUser?.();
    if (!u) return [];


    if (Array.isArray((u as any).roles) && (u as any).roles.length) {
      return (u as any).roles.map((r: string) =>
        r?.toString().trim()
          .replace(/_/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase())
      );
    }

     const map: Record<number, string> = {
      1: 'Administrador',
      2: 'Editor',
      3: 'Archivista',
      4: 'Usuario',
      5: 'Usuario Externo'
    };

    const id = Number((u as any).rolId);
    const name = Number.isFinite(id) ? (map[id] ?? 'Usuario') : 'Usuario';
    return [name];
  }

  roleLink(role: string): string {
    // Convertimos el texto legible a código interno
    const r = role
      ?.toUpperCase()
      .replace(/\s+/g, '_');

    switch (r) {
      case 'ADMIN':             return '/admin/dashboard';
      case 'EDITOR':            return '/editor/dashboard';
      case 'ARCHIVISTA':        return '/archivista/dashboard';
      case 'USUARIO':           return '/usuario/dashboard';
      case 'USUARIO_EXTERNO':   return '/externo/dashboard';
      default:                  return '/';
    }
  }




  notificationsLink(): string {
    // Por ahora siempre a admin/notifications como pediste:
    return '/admin/notifications';
  }

  noticeCount = () => {
    try {
      return this.store.count?.() ?? 0;
    } catch { return 0; }
  };

  signOut(): void {
    this.auth.logout?.();
    this.router.navigate(['/']);
  }

  // existente
  isOpen = signal(false);
  toggle() { this.isOpen.update(v => !v); }
  close()  { this.isOpen.set(false); }
}
