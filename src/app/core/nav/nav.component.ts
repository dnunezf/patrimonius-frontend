import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, fromEvent, interval, merge } from 'rxjs';
import { filter, startWith, switchMap } from 'rxjs/operators';

import { NavItem } from './nav.types';
import { NotificationsStore } from '../../shared/state/notifications.store';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { Notificacion } from '../../shared/models/notificacion.model';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, NgIf, NgFor],
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.css'],
})
export class NavComponent {
  @Input() brandTitle = 'Patrimonius';
  @Input() brandSubtitle = 'Museo Nacional de Costa Rica';
  @Input() logo = 'assets/logos/logo.png';

  private _items: NavItem[] = [];

  @Input() set items(value: NavItem[]) {
    this._items = (value || []).filter(
      (it) =>
        (it.label ?? '').trim().toLowerCase() !== 'inicio' && it.path !== '/',
    );
  }

  get items(): NavItem[] {
    return this._items;
  }

  @Input() loginItem?: NavItem;
  @Output() loginClick = new EventEmitter<void>();

  private readonly auth = inject(AuthService);
  private readonly store = inject(NotificationsStore);
  private readonly router = inject(Router);
  private readonly notiSvc = inject(NotificacionService);

  /** Panel desplegable del ícono 🔔 */
  notifDropdownLoading = false;
  notifDropdownError = '';
  notifItems: Notificacion[] = [];

  constructor() {
    toObservable(this.auth.currentUser)
      .pipe(
        switchMap((user) => {
          if (!user) {
            this.store.setCount(0);
            return EMPTY;
          }
          return merge(
            interval(30000).pipe(startWith(0)),
            fromEvent(document, 'visibilitychange').pipe(
              filter(() => document.visibilityState === 'visible'),
            ),
          ).pipe(switchMap(() => this.notiSvc.unreadCount()));
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (r) => this.store.setCount(r.unread ?? 0),
        error: () => this.store.setCount(0),
      });

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.close());
  }

  private readonly currentUser = computed(
    () =>
      this.auth.currentUser?.() ??
      this.auth.currentUser?.() ??
      this.auth.currentUser?.call?.(this.auth) ??
      this.auth.currentUser?.(),
  );

  isLoggedIn = () => !!this.auth.currentUser?.();

  userEmail = () => this.auth.currentUser?.()?.email ?? '';

  get rolesList(): string[] {
    const u = this.auth.currentUser?.();
    if (!u) return [];

    const roles = (u as any).roles;
    if (typeof roles === 'string' && roles.trim()) {
      return [this.roleDisplay(roles.trim())];
    }

    if (Array.isArray(roles) && roles.length) {
      return roles.map((r: any) => this.roleDisplay(String(r).trim()));
    }

    const names = [
      'Administrador',
      'Editor',
      'Archivista',
      'Usuario',
      'Usuario Externo',
    ];

    const id = Number((u as any).rolId);
    if (Number.isFinite(id) && id >= 1 && id <= names.length) {
      return [names[id - 1]];
    }

    return ['Usuario'];
  }

  private prettyRole(raw: string): string {
    return raw
      .trim()
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  roleDisplay(role: string): string {
    const r = role?.toUpperCase().replace(/\s+/g, '_');
    const map: Record<string, string> = {
      ADMIN: 'Administrador',
      ADMINISTRADOR: 'Administrador',
      EDITOR: 'Editor',
      ARCHIVADOR: 'Archivista',
      ARCHIVISTA: 'Archivista',
      USUARIO: 'Usuario',
      USUARIO_EXTERNO: 'Usuario Externo',
    };
    return map[r] ?? role;
  }

  roleLink(role: string): string {
    const r = role?.toUpperCase().replace(/\s+/g, '_');

    switch (r) {
      case 'ADMINISTRADOR':
        return '/admin/dashboard';
      case 'EDITOR':
        return '/editor/dashboard';
      case 'ARCHIVADOR':
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

  notificationsLink(): string {
    return '/admin/notifications';
  }

  noticeCount = () => {
    try {
      return this.store.count?.() ?? 0;
    } catch {
      return 0;
    }
  };

  isOpen = signal(false);

  close() {
    this.isOpen.set(false);
  }

  toggleNotifPanel(ev: MouseEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    const opening = !this.isOpen();
    this.isOpen.set(opening);
    if (opening) {
      this.loadNotifDropdown();
    }
  }

  private loadNotifDropdown(): void {
    this.notifDropdownLoading = true;
    this.notifDropdownError = '';
    this.notiSvc.unreadCount().subscribe({
      next: (r) => this.store.setCount(r.unread ?? 0),
      error: () => {},
    });
    this.notiSvc
      .listMine({ unreadOnly: true, limit: 40, offset: 0 })
      .subscribe({
        next: (r) => {
          this.notifItems = r.items ?? [];
          this.notifDropdownLoading = false;
        },
        error: () => {
          this.notifDropdownError = 'No se pudieron cargar las notificaciones.';
          this.notifItems = [];
          this.notifDropdownLoading = false;
        },
      });
  }

  isUnreadNotif(n: Notificacion): boolean {
    return Number(n.leida) === 0;
  }

  formatNotifDate(raw: string): string {
    if (!raw) return '';
    return new Date(raw).toLocaleString('es-CR');
  }

  /** Misma convención que notificaciones del sistema (recordatorio archivista). */
  isRevisionExpedientesActivosNotif(tipo?: string | null): boolean {
    return !!tipo && tipo.startsWith('ARCHIVISTA_EXP_ACTIVOS_');
  }

  /** Plazo de conservación del expediente archivado ya superado (gestión de plazos). */
  isExpedienteConservacionVencidoNotif(tipo?: string | null): boolean {
    return tipo === 'EXPEDIENTE_CONSERVACION_VENCIDO';
  }

  isExpedienteConservacionProximoNotif(tipo?: string | null): boolean {
    return tipo === 'EXPEDIENTE_CONSERVACION_PROXIMO';
  }

  titleForNotif(tipo?: string): string {
    if (this.isRevisionExpedientesActivosNotif(tipo)) {
      return 'Revisión de expedientes activos';
    }
    if (this.isExpedienteConservacionVencidoNotif(tipo)) {
      return 'Plazo de conservación vencido';
    }
    if (this.isExpedienteConservacionProximoNotif(tipo)) {
      return 'Plazo próximo a vencer (expediente)';
    }
    switch (tipo) {
      case 'PLAZO_ASIGNADO':
        return 'Plazo asignado';
      case 'DOC_EDITADO':
        return 'Documento editado';
      case 'DOC_FIRMA_SOLICITADA':
        return 'Firma requerida';
      case 'DOC_ARCHIVADO':
        return 'Documento archivado';
      case 'DOC_ELIMINACION':
        return 'Documento en eliminación';
      case 'DOC_FIRMA_INVALIDA':
        return 'Firma digital inválida';
      default:
        return 'Notificación';
    }
  }

  markNotifRead(n: Notificacion): void {
    if (!this.isUnreadNotif(n)) return;
    this.notiSvc.markRead(n.id).subscribe({
      next: () => {
        this.notifItems = this.notifItems.filter((x) => x.id !== n.id);
        this.store.decrement();
      },
      error: () => {
        this.notifDropdownError = 'No se pudo marcar como leída.';
      },
    });
  }

  drawerOpen = signal(false);
  openDrawer() {
    this.drawerOpen.set(true);
  }
  closeDrawer() {
    this.drawerOpen.set(false);
  }

  roleIcon(role: string): string {
    const r = role?.toUpperCase().replace(/\s+/g, '_');

    switch (r) {
      case 'ADMINISTRADOR':
      case 'ADMIN':
        return 'assets/icons/admin_2.png';
      case 'EDITOR':
        return 'assets/icons/pencil.png';
      case 'ARCHIVADOR':
      case 'ARCHIVISTA':
        return 'assets/icons/archive.png';
      case 'USUARIO':
        return 'assets/icons/user_2.png';
      case 'USUARIO_EXTERNO':
        return 'assets/icons/users.png';
      default:
        return '';
    }
  }

  toggleDrawer() {
    this.drawerOpen.update((v) => !v);
  }

  signOut(): void {
    this.closeDrawer();
    this.auth.logout?.();
    this.router.navigate(['/']);
  }

  badgeText(): string {
    const n = Number(this.noticeCount?.() ?? 0);

    if (!Number.isFinite(n) || n <= 0) return '';
    if (n > 99) return '99+';
    return String(n);
  }

  /**
   * Returns true when at least one action item should be shown.
   */
  canSeeActions = (): boolean => {
    return (
      this.canSeeUpload() ||
      this.canSeeConservationIntake() ||
      this.canSeeConsultaDocumentos()
    );
  };

  /** HU-025: consulta interna de documentos aprobados (roles 1–4); externo usa otro flujo. */
  canSeeConsultaDocumentos = (): boolean => {
    const normalized = this.rolesList.map((role) =>
      role.trim().toUpperCase().replace(/\s+/g, '_'),
    );
    return normalized.some(
      (r) =>
        r === 'ADMINISTRADOR' ||
        r === 'ADMIN' ||
        r === 'EDITOR' ||
        r === 'ARCHIVADOR' ||
        r === 'ARCHIVISTA' ||
        r === 'USUARIO',
    );
  };

  consultaDocumentosLink(): string {
    return '/consulta/aprobados';
  }

  /**
   * HU-21 upload action (nav): solo EDITOR (2), ARCHIVADOR (3) o master.
   */
  canSeeUpload = (): boolean => {
    const user: any = this.auth.currentUser?.();
    if (!user) return false;
    const rolId = Number(user?.rolId ?? user?.rol_id ?? 0);
    const isMaster = user?.isMaster === true;
    // Solo EDITOR (2) y ARCHIVADOR (3)
    return isMaster || rolId === 2 || rolId === 3;
  };

  uploadLink(): string {
    return '/documentos/carga-masiva';
  }

  /**
   * HU-019 conservation intake action.
   * Acceso permitido únicamente para Editor y Archivista.
   */
  canSeeConservationIntake = (): boolean => {
    const roles = this.rolesList.map((role) =>
      role.trim().toUpperCase().replace(/\s+/g, '_'),
    );

    return (
      roles.includes('EDITOR') ||
      roles.includes('ARCHIVADOR') ||
      roles.includes('ARCHIVISTA')
    );
  };

  conservationIntakeLink(): string {
    return '/conservacion/ingreso';
  }
}
