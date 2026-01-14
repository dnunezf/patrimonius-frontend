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

// Reemplaza TU método roles(): string[] { ... } por este getter:
  get rolesList(): string[] {
    const u = this.auth.currentUser?.();
    if (!u) return [];

    // 1) Si el backend ya manda nombres de roles (string o array de strings)
    const roles = (u as any).roles;
    if (typeof roles === 'string' && roles.trim()) {
      return [this.prettyRole(roles)];
    }
    if (Array.isArray(roles) && roles.length) {
      return roles.map((r: any) => this.prettyRole(String(r)));
    }

    // 2) Si viene rolId (1..5)
    const names = [
      'Administrador',
      'Editor',
      'Archivista',
      'Usuario',
      'Usuario Externo'
    ];

    const id = Number((u as any).rolId);
    if (Number.isFinite(id) && id >= 1 && id <= names.length) {
      return [names[id - 1]];
    }

    return ['Usuario'];
  }

  /** Convierte "USUARIO_EXTERNO" -> "Usuario Externo" */
  private prettyRole(raw: string): string {
    return raw
      .trim()
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }



  roleDisplay(role: string): string {
    const r = role?.toUpperCase().replace(/\s+/g, '_');
    const map: Record<string, string> = {
      ADMIN: 'Administrador',
      EDITOR: 'Editor',
      ARCHIVISTA: 'Archivista',
      USUARIO: 'Usuario',
      USUARIO_EXTERNO: 'Usuario Externo',
    };
    return map[r] ?? role;
  }


  roleLink(role: string): string {
    const r = role?.toUpperCase().replace(/\s+/g, '_');

    switch (r) {
      case 'ADMINISTRADOR':   return '/admin/dashboard';
      case 'EDITOR':           return '/editor/dashboard';
      case 'ARCHIVISTA':       return '/archivista/dashboard';
      case 'USUARIO':          return '/usuario/dashboard';
      case 'USUARIO_EXTERNO':  return '/externo/dashboard';
      default:                 return '/';
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



  // existente
  isOpen = signal(false);
  toggle() { this.isOpen.update(v => !v); }
  close()  { this.isOpen.set(false); }

  // Drawer
  drawerOpen = signal(false);
  openDrawer() { this.drawerOpen.set(true); }
  closeDrawer() { this.drawerOpen.set(false); }

  roleIcon(role: string): string {
    const r = role?.toUpperCase().replace(/\s+/g, '_');
    switch (r) {
      case 'ADMINISTRADOR':
      case 'ADMIN':
        return 'assets/icons/admin_2.png';
      case 'EDITOR':
        return 'assets/icons/pencil.png';
      case 'ARCHIVISTA':
        return 'assets/icons/archive.png';
      case 'USUARIO':
        return 'assets/icons/user_2.png';
      case 'USUARIO_EXTERNO':
        return 'assets/icons/users.png';
      default: return '';
    }
  }

  toggleDrawer() {
    this.drawerOpen.update(v => !v);
  }

  signOut(): void {
    this.closeDrawer();          // ✅ cierra menú
    this.auth.logout?.();
    this.router.navigate(['/']);
  }

  badgeText(): string {
    const n = Number(this.noticeCount?.() ?? 0);

    if (!Number.isFinite(n) || n <= 0) return '';
    if (n > 99) return '99+';
    return String(n);
  }


}
