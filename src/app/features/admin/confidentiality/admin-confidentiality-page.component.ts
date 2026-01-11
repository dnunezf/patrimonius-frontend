import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import {
  ConfidentialityService,
  ConfLevel,
  Action,
  ConfDto,
  ConfConfig,
  ConfDocumentOption,
} from '../../../../core/services/confidentiality.service';

import {
  AuditService,
  AuditItem,
} from '../../../../core/services/audit.service';
import {
  AccessControlService,
  DocumentRow,
} from '../../../../core/services/access-control.service';
import {
  AdminUsersService,
  AdminUser,
  Perm,
} from '../../../../core/services/admin-users.service';
import { environment } from '../../../../environments/environment';

import { ToastService } from '../../../shared/ui/toast.service';
import { ConfirmService } from '../../../shared/ui/confirm.service';

type RoleRowApi = { id: number; nombre: string };

type DocumentOption = {
  id: number;
  code: string;
  title: string;
  type?: string | null;
  unit?: string | null;
  unitId?: number | null;
  level?: ConfLevel | null;
};

type UserRuleRow = {
  userId: number;
  actions: Action[];
  displayName: string;
  email: string;
  unit?: string | null;
  editorAccessLabel: string;
  restrictions?: string | null;
  authorizedAt?: string | null;
};

type RoleRuleRow = {
  roleId: number;
  roleName?: string | null;
  actions: Action[];
};

const LEVEL_LABEL: Record<ConfLevel, string> = {
  PUBLIC: 'Público',
  INTERNAL: 'Interno',
  HIGH: 'Alto',
  RESTRICTED: 'Restringido',
};

@Component({
  selector: 'app-admin-confidentiality-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgIf, NgFor],
  templateUrl: './admin-confidentiality-page.component.html',
  styleUrls: ['./admin-confidentiality-page.component.css'],
})
export class AdminConfidentialityPageComponent {
  // UI state
  activeTab = signal<'control' | 'log'>('control');
  saving = signal(false);
  loading = signal(false);

  // Documents
  searchQuery = signal<string>('');
  selectedDocumentId = signal<number | null>(null);
  selectedDocument = signal<DocumentOption | null>(null);
  documentOptions = signal<DocumentOption[]>([]);

  // Config state (server vs edit)
  currentLevel = signal<ConfLevel>('PUBLIC');
  editLevel = signal<ConfLevel>('PUBLIC');
  allowedUsers = signal<{ userId: number; actions: Action[] }[]>([]);
  allowedRoles = signal<{ roleId: number; actions: Action[] }[]>([]);

  // Reference data
  allUsers = signal<AdminUser[]>([]);
  allRoles = signal<RoleRowApi[]>([]);

  // Metrics
  sensitiveDocsCount = computed(
    () =>
      this.documentOptions().filter(
        (d) => d.level === 'HIGH' || d.level === 'RESTRICTED'
      ).length
  );
  denied24hCount = signal<number>(0);
  allowedUsersCount = computed(() => this.allowedUsers().length);

  // Log
  logLoading = signal(false);
  logItems = signal<AuditItem[]>([]);
  logPeriod = signal<'24h' | '7d' | '30d'>('24h');
  logResult = signal<'ALL' | 'PERMITTED' | 'DENIED'>('ALL');
  logAction = signal<'ALL' | Action>('ALL');
  logEventType = signal<'ALL' | 'ACCESS' | 'CONFIG'>('ALL');

  // Add user modal
  isAddUserOpen = signal(false);
  userSearchQuery = signal('');
  selectedUserId = signal<number | null>(null);
  tempUserActions = signal<Action[]>(['VIEW']);

  // Add role modal
  isAddRoleOpen = signal(false);
  selectedRoleId = signal<number | null>(null);
  tempRoleActions = signal<Action[]>(['VIEW']);

  // Editor permissions modal
  isEditorPermsOpen = signal(false);
  editorPermsUserId = signal<number | null>(null);
  tempEditorPerms = signal<Perm[]>(['EDIT']);
  editorPermsSaving = signal(false);

  constructor(
    private confSvc: ConfidentialityService,
    private auditSvc: AuditService,
    private accessCtrl: AccessControlService,
    private adminUsers: AdminUsersService,
    private http: HttpClient,
    private toasts: ToastService,
    private confirm: ConfirmService
  ) {
    this.bootstrap();

    // keep selectedDocument in sync
    effect(() => {
      const id = this.selectedDocumentId();
      const doc = this.documentOptions().find((d) => d.id === id) || null;
      this.selectedDocument.set(doc);
    });

    // debounce search
    effect((onCleanup) => {
      const q = this.searchQuery();
      const handle = window.setTimeout(
        () => this.fetchDocumentsFromServer(q),
        200
      );
      onCleanup(() => window.clearTimeout(handle));
    });
  }

  private bootstrap(): void {
    this.loadUsers();
    this.loadRoles();
    this.fetchDocumentsFromServer('');
    this.refreshDenied24hMetric();
  }

  private loadUsers(): void {
    this.adminUsers.list().subscribe({
      next: (u) => this.allUsers.set(u || []),
      error: (e) => {
        this.allUsers.set([]);
        this.toasts.error(this.humanHttpError(e, 'Failed to load users.'));
      },
    });
  }

  private loadRoles(): void {
    this.http.get<RoleRowApi[]>(`${environment.apiUrl}/admin/roles`).subscribe({
      next: (r) => this.allRoles.set(r || []),
      error: (e) => {
        this.allRoles.set([]);
        this.toasts.error(this.humanHttpError(e, 'Failed to load roles.'));
      },
    });
  }

  /**
   * GET /admin/confidentiality/documents?search=
   */
  private fetchDocumentsFromServer(search: string): void {
    this.confSvc.listDocuments(search || '').subscribe({
      next: (rows: ConfDocumentOption[]) => {
        const options: DocumentOption[] = (rows || []).map((d) => ({
          id: Number(d.id),
          code: d.code || String(d.id),
          title: d.title || `Documento ${d.id}`,
          type: null,
          unit: d.unit ?? null,
          unitId: d.unitId ?? null,
          level: (d.level as ConfLevel) || null,
        }));
        this.documentOptions.set(options);

        const selectedId = this.selectedDocumentId();
        if (selectedId && !options.some((x) => x.id === selectedId)) {
          this.selectedDocumentId.set(null);
          this.selectedDocument.set(null);
          this.allowedUsers.set([]);
          this.allowedRoles.set([]);
          this.currentLevel.set('PUBLIC');
          this.editLevel.set('PUBLIC');
        }
      },
      error: () => {
        // fallback to original source
        this.loadDocumentsFallback();
      },
    });
  }

  private loadDocumentsFallback(): void {
    this.accessCtrl.getAccessControl({ page: 1, pageSize: 500 }).subscribe({
      next: (page) => {
        const items: DocumentRow[] = page?.items || [];
        const options: DocumentOption[] = items.map((d) => ({
          id: d.id,
          code: d.code || String(d.id),
          title: d.title || `Documento ${d.id}`,
          type: (d as any).categoria ?? null,
          unit: d.unit ?? null,
          unitId: d.unitId ?? null,
          level: null,
        }));
        this.documentOptions.set(options);
      },
      error: (e) => {
        this.documentOptions.set([]);
        this.toasts.error(this.humanHttpError(e, 'Failed to load documents.'));
      },
    });
  }

  levelLabel(lv: ConfLevel): string {
    return LEVEL_LABEL[lv];
  }

  currentLevelLabel(): string {
    return LEVEL_LABEL[this.currentLevel()];
  }

  filteredDocuments(): DocumentOption[] {
    const q = (this.searchQuery() || '').trim().toLowerCase();
    if (!q) return this.documentOptions();
    return this.documentOptions().filter(
      (d) =>
        (d.title || '').toLowerCase().includes(q) ||
        (d.code || '').toLowerCase().includes(q) ||
        String(d.id).includes(q) ||
        (d.type || '').toLowerCase().includes(q)
    );
  }

  filteredDocumentsCount(): number {
    return this.filteredDocuments().length;
  }

  filteredUsers(): AdminUser[] {
    const q = (this.userSearchQuery() || '').trim().toLowerCase();
    const base = this.allUsers();
    if (!q) return base;
    return base.filter((u) => {
      const full = `${u.nombre} ${u.apellido1} ${
        u.apellido2 || ''
      }`.toLowerCase();
      const unit = ((u as any).unidad || '').toLowerCase();
      return (
        full.includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        unit.includes(q)
      );
    });
  }

  filteredUsersCount(): number {
    return this.filteredUsers().length;
  }

  onSelectDocument(raw: any): void {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      this.toasts.error('Invalid document selection.');
      return;
    }
    this.selectedDocumentId.set(parsed);
    this.loadConfig(parsed);
  }

  private loadConfig(docId: number): void {
    this.loading.set(true);

    this.confSvc.getConfig(docId).subscribe({
      next: (cfg: ConfConfig) => {
        const level = (cfg?.level || 'PUBLIC') as ConfLevel;

        this.currentLevel.set(level);
        this.editLevel.set(level);

        this.allowedUsers.set(
          (cfg.users || []).map((u) => ({
            userId: Number(u.userId),
            actions: this.normalizeActions(u.actions),
          }))
        );

        this.allowedRoles.set(
          (cfg.roles || []).map((r) => ({
            roleId: Number(r.roleId),
            actions: this.normalizeActions(r.actions),
          }))
        );

        this.toasts.info('Configuration loaded.');
      },
      error: (e) => {
        this.allowedUsers.set([]);
        this.allowedRoles.set([]);
        this.currentLevel.set('PUBLIC');
        this.editLevel.set('PUBLIC');
        this.toasts.error(
          this.humanHttpError(e, 'Failed to load configuration.')
        );
      },
      complete: () => this.loading.set(false),
    });
  }

  userRuleRows = computed<UserRuleRow[]>(() => {
    const users = this.allUsers();
    const mapById = new Map<number, AdminUser>(users.map((u) => [u.id, u]));

    return this.allowedUsers().map((u) => {
      const found = mapById.get(u.userId);

      const displayName = found
        ? `${found.nombre} ${found.apellido1}${
            found.apellido2 ? ' ' + found.apellido2 : ''
          }`
        : `Usuario #${u.userId}`;

      const email = found?.email || '';
      const unit = ((found as any)?.unidad as string) || '';

      const rawEditorPerms =
        ((found as any)?.editorPermissions as Perm[]) ??
        ((found as any)?.permisosEditor as Perm[]) ??
        [];

      const editorPerms = Array.from(
        new Set(
          (rawEditorPerms || []).filter((p) => p === 'EDIT' || p === 'SIGN')
        )
      ) as Perm[];

      const editorAccessLabel =
        editorPerms.includes('EDIT') && editorPerms.includes('SIGN')
          ? 'Edición y Firma'
          : editorPerms.includes('EDIT')
          ? 'Edición'
          : editorPerms.includes('SIGN')
          ? 'Firma'
          : '—';

      return {
        userId: u.userId,
        actions: u.actions,
        displayName,
        email,
        unit,
        editorAccessLabel,
        restrictions: null,
        authorizedAt: null,
      };
    });
  });

  roleRules = computed<RoleRuleRow[]>(() => {
    const roles = this.allRoles();
    const mapById = new Map<number, RoleRowApi>(roles.map((r) => [r.id, r]));
    return this.allowedRoles().map((r) => ({
      roleId: r.roleId,
      roleName: mapById.get(r.roleId)?.nombre || null,
      actions: r.actions,
    }));
  });

  saveConfig(): void {
    const docId = this.selectedDocumentId();
    if (!docId) {
      this.toasts.error('Please select a document first.');
      return;
    }

    const level = this.editLevel();
    const users = this.allowedUsers();
    const roles = this.allowedRoles();

    const sensitive = level !== 'PUBLIC';
    if (sensitive && users.length === 0 && roles.length === 0) {
      this.toasts.error(
        'Sensitive levels require at least one authorized user or role.'
      );
      return;
    }

    if (!this.validateAllowLists(users, roles)) return;

    const dto: ConfDto = {
      level,
      users: users.map((u) => ({
        userId: u.userId,
        actions: this.normalizeActions(u.actions),
      })),
      roles: roles.map((r) => ({
        roleId: r.roleId,
        actions: this.normalizeActions(r.actions),
      })),
    };

    this.saving.set(true);

    this.confSvc.setConfig(docId, dto).subscribe({
      next: (saved) => {
        const lv = (saved?.level || level) as ConfLevel;
        this.currentLevel.set(lv);
        this.editLevel.set(lv);

        this.allowedUsers.set(
          (saved?.users || dto.users).map((u) => ({
            userId: Number(u.userId),
            actions: this.normalizeActions(u.actions),
          }))
        );

        this.allowedRoles.set(
          (saved?.roles || dto.roles).map((r) => ({
            roleId: Number(r.roleId),
            actions: this.normalizeActions(r.actions),
          }))
        );

        this.toasts.success('Changes saved.');
        this.refreshDenied24hMetric();
      },
      error: (err: unknown) => {
        const httpErr = err as HttpErrorResponse;
        // Handle servers that return 204/empty body (should be fixed in backend, but keep UX resilient)
        if (httpErr && (httpErr.status === 200 || httpErr.status === 204)) {
          this.loadConfig(docId);
          this.toasts.success('Changes saved.');
        } else {
          this.toasts.error(
            this.humanHttpError(err, 'Failed to save changes.')
          );
        }
      },
      complete: () => this.saving.set(false),
    });
  }

  private validateAllowLists(
    users: { userId: number; actions: Action[] }[],
    roles: { roleId: number; actions: Action[] }[]
  ): boolean {
    const userIds = new Set<number>();
    for (const u of users) {
      if (!Number.isFinite(u.userId) || u.userId <= 0) {
        this.toasts.error('Validation: userId must be a positive number.');
        return false;
      }
      if (userIds.has(u.userId)) {
        this.toasts.error('Validation: duplicate user in allow-list.');
        return false;
      }
      userIds.add(u.userId);

      const a = this.normalizeActions(u.actions);
      if (a.length === 0) {
        this.toasts.error(
          'Validation: each authorized user must have at least one action.'
        );
        return false;
      }
    }

    const roleIds = new Set<number>();
    for (const r of roles) {
      if (!Number.isFinite(r.roleId) || r.roleId <= 0) {
        this.toasts.error('Validation: roleId must be a positive number.');
        return false;
      }
      if (roleIds.has(r.roleId)) {
        this.toasts.error('Validation: duplicate role in allow-list.');
        return false;
      }
      roleIds.add(r.roleId);

      const a = this.normalizeActions(r.actions);
      if (a.length === 0) {
        this.toasts.error(
          'Validation: each authorized role must have at least one action.'
        );
        return false;
      }
    }

    return true;
  }

  private normalizeActions(actions: Action[] | any): Action[] {
    const a = Array.isArray(actions) ? actions : [];
    const set = new Set<Action>();
    for (const x of a) {
      if (x === 'VIEW' || x === 'EDIT' || x === 'SIGN') set.add(x);
    }
    return Array.from(set);
  }

  // Add user modal
  openAddUserModal(): void {
    this.isAddUserOpen.set(true);
    this.userSearchQuery.set('');
    this.selectedUserId.set(null);
    this.tempUserActions.set(['VIEW']);
  }
  closeAddUserModal(): void {
    this.isAddUserOpen.set(false);
  }
  toggleTempUserAction(a: Action): void {
    const cur = this.tempUserActions();
    this.tempUserActions.set(
      cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]
    );
  }
  isSelectedUserAlreadyAuthorized(): boolean {
    const id = this.selectedUserId();
    return !!id && this.allowedUsers().some((u) => u.userId === id);
  }
  isAddUserDisabled(): boolean {
    const id = this.selectedUserId();
    const actions = this.normalizeActions(this.tempUserActions());
    return (
      !id || actions.length === 0 || this.isSelectedUserAlreadyAuthorized()
    );
  }
  confirmAddUser(): void {
    const id = this.selectedUserId();
    if (!id) return this.toasts.error('Please select a user.');
    if (this.isSelectedUserAlreadyAuthorized())
      return this.toasts.error('This user is already authorized.');

    const actions = this.normalizeActions(this.tempUserActions());
    if (actions.length === 0)
      return this.toasts.error('Select at least one permission.');

    this.allowedUsers.update((arr) => [...arr, { userId: id, actions }]);
    this.closeAddUserModal();
    this.toasts.success('User added to allow-list.');
  }

  async removeUserRule(index: number): Promise<void> {
    const ok = await this.confirm.ask(
      '¿Eliminar este usuario autorizado?',
      'Confirmar eliminación'
    );
    if (!ok) return;
    this.allowedUsers.update((arr) => arr.filter((_, i) => i !== index));
    this.toasts.info('User removed (pending save).');
  }

  // Add role modal
  openAddRoleModal(): void {
    this.isAddRoleOpen.set(true);
    this.selectedRoleId.set(null);
    this.tempRoleActions.set(['VIEW']);
  }
  closeAddRoleModal(): void {
    this.isAddRoleOpen.set(false);
  }
  toggleTempRoleAction(a: Action): void {
    const cur = this.tempRoleActions();
    this.tempRoleActions.set(
      cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]
    );
  }
  isSelectedRoleAlreadyAuthorized(): boolean {
    const id = this.selectedRoleId();
    return !!id && this.allowedRoles().some((r) => r.roleId === id);
  }
  isAddRoleDisabled(): boolean {
    const id = this.selectedRoleId();
    const actions = this.normalizeActions(this.tempRoleActions());
    return (
      !id || actions.length === 0 || this.isSelectedRoleAlreadyAuthorized()
    );
  }
  confirmAddRole(): void {
    const id = this.selectedRoleId();
    if (!id) return this.toasts.error('Please select a role.');
    if (this.isSelectedRoleAlreadyAuthorized())
      return this.toasts.error('This role is already authorized.');

    const actions = this.normalizeActions(this.tempRoleActions());
    if (actions.length === 0)
      return this.toasts.error('Select at least one action.');

    this.allowedRoles.update((arr) => [...arr, { roleId: id, actions }]);
    this.closeAddRoleModal();
    this.toasts.success('Role added to allow-list.');
  }

  async removeRoleRule(index: number): Promise<void> {
    const ok = await this.confirm.ask(
      '¿Eliminar este rol autorizado?',
      'Confirmar eliminación'
    );
    if (!ok) return;
    this.allowedRoles.update((arr) => arr.filter((_, i) => i !== index));
    this.toasts.info('Role removed (pending save).');
  }

  // Log
  loadLog(): void {
    this.logLoading.set(true);

    const filters: Record<string, string> = {};
    if (this.logResult() === 'PERMITTED') filters['resultado'] = 'OK';
    if (this.logResult() === 'DENIED') filters['resultado'] = 'DENIED';
    if (this.logAction() !== 'ALL')
      filters['accion_solicitada'] = this.logAction();

    if (this.logEventType() === 'ACCESS') filters['tipo_evento'] = 'ACCESS';
    if (this.logEventType() === 'CONFIG') filters['tipo_evento'] = 'CONFIG';

    this.auditSvc
      .listEvents({
        page: 1,
        pageSize: 25,
        ...filters,
        sortBy: 'fecha_hora',
        sortDir: 'desc',
      })
      .subscribe({
        next: (page) => this.logItems.set(page.items || []),
        error: (e) =>
          this.toasts.error(
            this.humanHttpError(e, 'Failed to load audit log.')
          ),
        complete: () => this.logLoading.set(false),
      });
  }

  // Editor perms
  openEditorPermsModal(userId: number): void {
    this.editorPermsUserId.set(userId);

    const u = this.allUsers().find((x) => x.id === userId);
    const raw =
      ((u as any)?.editorPermissions as Perm[]) ??
      ((u as any)?.permisosEditor as Perm[]) ??
      [];

    const normalized = Array.from(
      new Set((raw || []).filter((p) => p === 'EDIT' || p === 'SIGN'))
    ) as Perm[];
    this.tempEditorPerms.set(
      normalized.length ? normalized : (['EDIT'] as Perm[])
    );

    this.isEditorPermsOpen.set(true);
  }
  closeEditorPermsModal(): void {
    this.isEditorPermsOpen.set(false);
  }
  editorPermsUserLabel(): string {
    const id = this.editorPermsUserId();
    const u = this.allUsers().find((x) => x.id === id);
    return u ? `${u.nombre} ${u.apellido1}` : '';
  }
  editorPermsRoleLabel(): string {
    return 'Editor';
  }
  toggleTempEditorPerm(p: Perm): void {
    const cur = this.tempEditorPerms();
    this.tempEditorPerms.set(
      cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]
    );
  }

  saveEditorPerms(): void {
    const id = this.editorPermsUserId();
    if (!id) return;

    const perms = Array.from(
      new Set(
        this.tempEditorPerms().filter((p) => p === 'EDIT' || p === 'SIGN')
      )
    ) as Perm[];
    this.editorPermsSaving.set(true);

    // Backend compatibility: accepts permisosEditor
    this.adminUsers.update(id, { permisosEditor: perms }).subscribe({
      next: (updated) => {
        const backendPerms =
          ((updated as any)?.editorPermissions as Perm[]) ??
          ((updated as any)?.permisosEditor as Perm[]) ??
          perms;

        this.allUsers.update((arr) =>
          arr.map((u) =>
            u.id === id
              ? ({
                  ...u,
                  editorPermissions: backendPerms,
                  permisosEditor: backendPerms,
                } as any)
              : u
          )
        );

        this.closeEditorPermsModal();
        this.toasts.success('Editor permissions updated.');
      },
      error: (e) =>
        this.toasts.error(
          this.humanHttpError(e, 'Failed to update editor permissions.')
        ),
      complete: () => this.editorPermsSaving.set(false),
    });
  }

  private refreshDenied24hMetric(): void {
    // Best-effort: relies on your AuditService supporting totalItems.
    this.auditSvc
      .listEvents({
        page: 1,
        pageSize: 1,
        resultado: 'DENIED',
        sortBy: 'fecha_hora',
        sortDir: 'desc',
      })
      .subscribe({
        next: (page: any) =>
          this.denied24hCount.set(Number(page?.totalItems ?? 0)),
        error: () => this.denied24hCount.set(0),
      });
  }

  private humanHttpError(err: any, fallback: string): string {
    const e = err as HttpErrorResponse;
    if (!e) return fallback;

    const msg =
      (typeof e.error === 'string' && e.error) ||
      e.error?.message ||
      e.message ||
      fallback;

    // keep it short for toasts
    return msg.length > 120 ? msg.slice(0, 117) + '...' : msg;
  }
}
