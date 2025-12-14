import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

type RoleCard = {
  key: 'ADMINISTRADOR' | 'EDITOR' | 'ARCHIVISTA' | 'USUARIO' | 'USUARIO_EXTERNO';
  title: string;
  subtitle: string;
  icon: string;
  cssClass: string;
  bullets: string[];
};

@Component({
  selector: 'app-main-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './main-dashboard.component.html',
  styleUrls: ['./main-dashboard.component.css'],
})
export class MainDashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Todas las cards disponibles (igual a tu diseño)
  private readonly ALL_CARDS: RoleCard[] = [
    {
      key: 'ADMINISTRADOR',
      title: 'Administrador',
      subtitle: 'Control total del sistema',
      icon: 'assets/icons/admin_2.png',
      cssClass: 'admin',
      bullets: ['Gestionar usuarios y roles', 'Configurar sistema', 'Ver reportes completos'],
    },
    {
      key: 'EDITOR',
      title: 'Editor',
      subtitle: 'Crear y modificar documentos',
      icon: 'assets/icons/pencil.png',
      cssClass: 'editor',
      bullets: ['Crear documentos', 'Editar contenido', 'Enviar a firma'],
    },
    {
      key: 'ARCHIVISTA',
      title: 'Archivista',
      subtitle: 'Organizar y archivar',
      icon: 'assets/icons/archive.png',
      cssClass: 'archivista',
      bullets: ['Archivar documentos', 'Organizar categorías', 'Generar índices'],
    },
    {
      key: 'USUARIO',
      title: 'Usuario',
      subtitle: 'Acceso básico',
      icon: 'assets/icons/user_2.png',
      cssClass: 'usuario',
      bullets: ['Ver documentos asignados', 'Descargar archivos', 'Comentar'],
    },
    {
      key: 'USUARIO_EXTERNO',
      title: 'Usuario Externo',
      subtitle: 'Acceso limitado',
      icon: 'assets/icons/users.png',
      cssClass: 'externo',
      bullets: ['Ver documentos públicos', 'Acceso temporal', 'Sin edición'],
    },
  ];

  /** Roles del usuario logueado normalizados a: ADMINISTRADOR | EDITOR | ... */
  get userRoleKeys(): RoleCard['key'][] {
    const u: any = this.auth.currentUser?.();
    if (!u) return [];

    // Si viene "roles" como string o array
    const roles = u.roles;
    if (typeof roles === 'string' && roles.trim()) return [this.normalizeRole(roles)];
    if (Array.isArray(roles) && roles.length) return roles.map((r: any) => this.normalizeRole(String(r)));

    // Si viene rolId (1..5)
    const names: RoleCard['key'][] = ['ADMINISTRADOR', 'EDITOR', 'ARCHIVISTA', 'USUARIO', 'USUARIO_EXTERNO'];
    const id = Number(u.rolId);
    if (Number.isFinite(id) && id >= 1 && id <= 5) return [names[id - 1]];

    return [];
  }

  /** Cards visibles: solo las del usuario */
  get visibleCards(): RoleCard[] {
    const allowed = new Set(this.userRoleKeys);
    return this.ALL_CARDS.filter(c => allowed.has(c.key));
  }

  /** Al hacer click: misma navegación que en el nav */
  goToRole(roleKey: RoleCard['key']): void {
    this.router.navigate([this.roleLink(roleKey)]);
  }

  /** Mismas rutas que usás en NavComponent */
  private roleLink(role: string): string {
    switch (role) {
      case 'ADMINISTRADOR': return '/admin/dashboard';
      case 'EDITOR': return '/editor/dashboard';
      case 'ARCHIVISTA': return '/archivista/dashboard';
      case 'USUARIO': return '/usuario/dashboard';
      case 'USUARIO_EXTERNO': return '/externo/dashboard';
      default: return '/';
    }
  }

  /** Normaliza: "Administrador", "ADMIN", "USUARIO EXTERNO", "USUARIO_EXTERNO" */
  private normalizeRole(raw: string): RoleCard['key'] {
    const r = raw.trim().toUpperCase().replace(/\s+/g, '_');

    if (r === 'ADMIN') return 'ADMINISTRADOR';
    if (r === 'USUARIOEXTERNO') return 'USUARIO_EXTERNO';

    // Si ya viene bien:
    if (r === 'ADMINISTRADOR' || r === 'EDITOR' || r === 'ARCHIVISTA' || r === 'USUARIO' || r === 'USUARIO_EXTERNO') {
      return r;
    }

    // fallback
    return 'USUARIO';
  }
}
