import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

type RoleKey =
  | 'ADMINISTRADOR'
  | 'EDITOR'
  | 'ARCHIVISTA'
  | 'USUARIO'
  | 'USUARIO_EXTERNO';

type FeatureKey =
  | 'CARGA_DOCUMENTOS'
  | 'CONSERVACION_INGRESO'
  | 'CONSULTA_APROBADOS';

type DashboardCard = {
  roleKey?: RoleKey;
  featureKey?: FeatureKey;

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

  private readonly ROLE_CARDS: DashboardCard[] = [
    {
      roleKey: 'ADMINISTRADOR',
      title: 'Administrador',
      subtitle: 'Control total del sistema',
      icon: 'assets/icons/admin_2.png',
      cssClass: 'admin',
      bullets: [
        'Gestionar usuarios y roles',
        'Configurar sistema',
        'Ver reportes completos',
      ],
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
      bullets: [
        'Archivar documentos',
        'Organizar categorías',
        'Generar índices',
      ],
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

  private readonly UPLOAD_CARD: DashboardCard = {
    featureKey: 'CARGA_DOCUMENTOS',
    title: 'Carga de documentos',
    subtitle: 'Suba documentos existentes al sistema',
    icon: 'assets/icons/upload.png',
    cssClass: 'upload',
    bullets: [
      'Carga por lote de documentos',
      'Validación de duplicados',
      'Registro en bitácora',
    ],
  };

  private readonly CONSERVATION_INTAKE_CARD: DashboardCard = {
    featureKey: 'CONSERVACION_INGRESO',
    title: 'Gestión Documental',
    subtitle: 'Conservación, validación archivística y exportación EAD 2002',
    icon: 'assets/icons/archive.png',
    cssClass: 'archivista',
    bullets: [
      'Validar elegibilidad del documento',
      'Clasificar y describir en conservación',
      'Exportar XML conforme a EAD 2002',
    ],
  };

  private readonly CONSULTA_APROBADOS_CARD: DashboardCard = {
    featureKey: 'CONSULTA_APROBADOS',
    title: 'Consulta de documentos',
    subtitle: 'Documentos aprobados y archivados según sus permisos',
    icon: 'assets/icons/user_2.png',
    cssClass: 'usuario',
    bullets: [
      'Búsqueda y filtros',
      'Vista previa y descarga',
      'Registro en bitácora',
    ],
  };

  get userRoleKeys(): RoleKey[] {
    const u: any = this.auth.currentUser?.();
    if (!u) return [];

    const roles = u.roles;
    if (typeof roles === 'string' && roles.trim()) {
      return [this.normalizeRole(roles)];
    }
    if (Array.isArray(roles) && roles.length) {
      return roles.map((r: any) => this.normalizeRole(String(r)));
    }

    const names: RoleKey[] = [
      'ADMINISTRADOR',
      'EDITOR',
      'ARCHIVISTA',
      'USUARIO',
      'USUARIO_EXTERNO',
    ];

    const id = Number(u.rolId);
    if (Number.isFinite(id) && id >= 1 && id <= 5) return [names[id - 1]];

    return [];
  }

  get canAccessUpload(): boolean {
    const u: any = this.auth.currentUser?.();
    if (!u) return false;

    const perms = Array.isArray(u.permissions) ? u.permissions : [];
    const normalizedPerms = perms.map((p: any) =>
      String(p).toUpperCase().replace(/\s+/g, '_'),
    );

    if (normalizedPerms.includes('UPLOAD')) return true;

    const roles = new Set(this.userRoleKeys);
    return roles.has('EDITOR') || roles.has('ARCHIVISTA');
  }

  get canSeeUploadCard(): boolean {
    return this.canAccessUpload;
  }

  get canSeeConservationIntakeCard(): boolean {
    const roles = new Set(this.userRoleKeys);
    return roles.has('EDITOR') || roles.has('ARCHIVISTA');
  }

  get visibleCards(): DashboardCard[] {
    const allowedRoles = new Set(this.userRoleKeys);

    const byRole = this.ROLE_CARDS.filter(
      (c) => c.roleKey && allowedRoles.has(c.roleKey),
    );

    const extras: DashboardCard[] = [];

    if (this.canSeeUploadCard) {
      extras.push(this.UPLOAD_CARD);
    }

    if (this.canSeeConservationIntakeCard) {
      extras.push(this.CONSERVATION_INTAKE_CARD);
    }

    extras.push(this.CONSULTA_APROBADOS_CARD);

    return [...byRole, ...extras];
  }

  goToCard(c: DashboardCard): void {
    if (c.roleKey) {
      this.router.navigate([this.roleLink(c.roleKey)]);
      return;
    }

    if (c.featureKey === 'CARGA_DOCUMENTOS') {
      this.router.navigate(['/documentos/carga-masiva']);
      return;
    }

    if (c.featureKey === 'CONSERVACION_INGRESO') {
      this.router.navigate(['/conservacion/ingreso']);
      return;
    }

    if (c.featureKey === 'CONSULTA_APROBADOS') {
      const roles = new Set(this.userRoleKeys);
      if (roles.has('USUARIO_EXTERNO')) {
        this.router.navigate(['/consulta/aprobados-externo']);
      } else {
        this.router.navigate(['/consulta/aprobados']);
      }
      return;
    }
  }

  private roleLink(role: RoleKey): string {
    switch (role) {
      case 'ADMINISTRADOR':
        return '/admin/dashboard';
      case 'EDITOR':
        return '/editor/dashboard';
      case 'ARCHIVISTA':
        return '/archivista/dashboard';
      case 'USUARIO':
        return '/usuario/dashboard';
      case 'USUARIO_EXTERNO':
        return '/consulta/aprobados-externo';
      default:
        return '/';
    }
  }

  private normalizeRole(raw: string): RoleKey {
    const r = raw.trim().toUpperCase().replace(/\s+/g, '_');
    if (r === 'ADMIN') return 'ADMINISTRADOR';
    if (r === 'USUARIOEXTERNO') return 'USUARIO_EXTERNO';
    if (r === 'ARCHIVADOR') return 'ARCHIVISTA';

    if (
      r === 'ADMINISTRADOR' ||
      r === 'EDITOR' ||
      r === 'ARCHIVISTA' ||
      r === 'USUARIO' ||
      r === 'USUARIO_EXTERNO'
    ) {
      return r;
    }

    return 'USUARIO';
  }
}
