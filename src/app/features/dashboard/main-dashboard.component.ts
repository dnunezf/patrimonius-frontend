import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

type RoleKey = 'ADMINISTRADOR' | 'EDITOR' | 'ARCHIVISTA' | 'USUARIO' | 'USUARIO_EXTERNO';

type DashboardCard = {
  // roleKey: si es card por rol. featureKey: si es una funcionalidad independiente.
  roleKey?: RoleKey;
  featureKey?: 'CARGA_DOCUMENTOS';

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

  // Cards por rol (igual a tu diseño actual)
  private readonly ROLE_CARDS: DashboardCard[] = [
    {
      roleKey: 'ADMINISTRADOR',
      title: 'Administrador',
      subtitle: 'Control total del sistema',
      icon: 'assets/icons/admin_2.png',
      cssClass: 'admin',
      bullets: ['Gestionar usuarios y roles', 'Configurar sistema', 'Ver reportes completos'],
    },
    {
      roleKey: 'EDITOR',
      title: 'Editor',
      subtitle: 'Crear y modificar documentos',
      icon: 'assets/icons/pencil.png',
      cssClass: 'editor',
      bullets: ['Crear documentos', 'Editar contenido', 'Enviar a firma'],
    },
    {
      roleKey: 'ARCHIVISTA',
      title: 'Archivista',
      subtitle: 'Organizar y archivar',
      icon: 'assets/icons/archive.png',
      cssClass: 'archivista',
      bullets: ['Archivar documentos', 'Organizar categorías', 'Generar índices'],
    },
    {
      roleKey: 'USUARIO',
      title: 'Usuario',
      subtitle: 'Acceso básico',
      icon: 'assets/icons/user_2.png',
      cssClass: 'usuario',
      bullets: ['Ver documentos asignados', 'Descargar archivos', 'Comentar'],
    },
    {
      roleKey: 'USUARIO_EXTERNO',
      title: 'Usuario Externo',
      subtitle: 'Acceso limitado',
      icon: 'assets/icons/users.png',
      cssClass: 'externo',
      bullets: ['Ver documentos públicos', 'Acceso temporal', 'Sin edición'],
    },
  ];

  // Card “feature” independiente del rol: HU-21
  private readonly UPLOAD_CARD: DashboardCard = {
    featureKey: 'CARGA_DOCUMENTOS',
    title: 'Carga de documentos',
    subtitle: 'Suba documentos existentes al sistema',
    icon: 'assets/icons/upload.png', // poné el icono que querás
    cssClass: 'upload',              // agregás estilo en CSS
    bullets: ['Carga por carpeta o CSV', 'Validación de duplicados', 'Registro en bitácora'],
  };

  /** Roles del usuario logueado normalizados */
  get userRoleKeys(): RoleKey[] {
    const u: any = this.auth.currentUser?.();
    if (!u) return [];

    const roles = u.roles;
    if (typeof roles === 'string' && roles.trim()) return [this.normalizeRole(roles)];
    if (Array.isArray(roles) && roles.length) return roles.map((r: any) => this.normalizeRole(String(r)));

    const names: RoleKey[] = ['ADMINISTRADOR', 'EDITOR', 'ARCHIVISTA', 'USUARIO', 'USUARIO_EXTERNO'];
    const id = Number(u.rolId);
    if (Number.isFinite(id) && id >= 1 && id <= 5) return [names[id - 1]];

    return [];
  }

  /** Condición para mostrar la card de carga (HU-21) */
  get canSeeUploadCard(): boolean {
    const u: any = this.auth.currentUser?.();
    if (!u) return false;

    // ✅ Opción A (temporal, mientras confirman): cualquiera logueado
    return true;

    // ✅ Opción B (cuando confirmen permiso):
    // 1) si el backend manda boolean:
    // return u.canUpload === true;

    // 2) si el backend manda lista de permisos:
    // const perms = Array.isArray(u.permissions) ? u.permissions : [];
    // return perms.map((p:any) => String(p).toUpperCase()).includes('UPLOAD');
  }

  /** Cards visibles: roles del usuario + (opcional) carga HU-21 */
  get visibleCards(): DashboardCard[] {
    const allowedRoles = new Set(this.userRoleKeys);
    const byRole = this.ROLE_CARDS.filter(c => c.roleKey && allowedRoles.has(c.roleKey));

    const extras: DashboardCard[] = [];
    if (this.canSeeUploadCard) extras.push(this.UPLOAD_CARD);

    return [...byRole, ...extras];
  }

  /** Click en card: navega según rol o feature */
  goToCard(c: DashboardCard): void {
    if (c.roleKey) {
      this.router.navigate([this.roleLink(c.roleKey)]);
      return;
    }
    if (c.featureKey === 'CARGA_DOCUMENTOS') {
      this.router.navigate(['/documentos/carga-masiva']); // ✅ ajustá esta ruta a la real
    }
  }

  private roleLink(role: RoleKey): string {
    switch (role) {
      case 'ADMINISTRADOR': return '/admin/dashboard';
      case 'EDITOR': return '/editor/dashboard';
      case 'ARCHIVISTA': return '/archivista/dashboard';
      case 'USUARIO': return '/usuario/dashboard';
      case 'USUARIO_EXTERNO': return '/externo/dashboard';
      default: return '/';
    }
  }

  private normalizeRole(raw: string): RoleKey {
    const r = raw.trim().toUpperCase().replace(/\s+/g, '_');
    if (r === 'ADMIN') return 'ADMINISTRADOR';
    if (r === 'USUARIOEXTERNO') return 'USUARIO_EXTERNO';

    if (r === 'ADMINISTRADOR' || r === 'EDITOR' || r === 'ARCHIVISTA' || r === 'USUARIO' || r === 'USUARIO_EXTERNO') {
      return r;
    }
    return 'USUARIO';
  }
}
