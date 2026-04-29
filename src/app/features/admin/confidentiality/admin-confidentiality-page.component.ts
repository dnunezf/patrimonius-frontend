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
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-confidentiality-page.component.html',
  styleUrls: ['./admin-confidentiality-page.component.css'],
})
export class AdminConfidentialityPageComponent {
  // ----------------------------
  // UI state
  // ----------------------------
  saving = signal(false);
  loading = signal(false);

  // ----------------------------
  // Documents
  // ----------------------------
  searchQuery = signal<string>('');
  selectedDocumentId = signal<number | null>(null);
  selectedDocument = signal<DocumentOption | null>(null);
  documentOptions = signal<DocumentOption[]>([]);

  // ----------------------------
  // Config state
  // ----------------------------
  currentLevel = signal<ConfLevel>('PUBLIC');
  editLevel = signal<ConfLevel>('PUBLIC');
  allowedUsers = signal<{ userId: number; actions: Action[] }[]>([]);
  allowedRoles = signal<{ roleId: number; actions: Action[] }[]>([]);

  // ----------------------------
  // Reference data
  // ----------------------------
  allUsers = signal<AdminUser[]>([]);
  allRoles = signal<RoleRowApi[]>([]);

  allowedUsersCount = computed(() => this.allowedUsers().length);

  // ----------------------------
  // Add user modal
  // ----------------------------
  isAddUserOpen = signal(false);
  userSearchQuery = signal('');
  selectedUserId = signal<number | null>(null);
  tempUserActions = signal<Action[]>(['VIEW']);

  // ----------------------------
  // Add role modal
  // ----------------------------
  isAddRoleOpen = signal(false);
  roleSearchQuery = signal('');
  selectedRoleId = signal<number | null>(null);
  tempRoleActions = signal<Action[]>(['VIEW']);

  constructor(
    private confSvc: ConfidentialityService,
    private accessCtrl: AccessControlService,
    private adminUsers: AdminUsersService,
    private http: HttpClient,
    private toasts: ToastService,
    private confirm: ConfirmService,
  ) {
    this.bootstrap();

    effect(() => {
      const id = this.selectedDocumentId();
      const doc = this.documentOptions().find((d) => d.id === id) || null;
      this.selectedDocument.set(doc);
    });

    effect((onCleanup) => {
      const q = this.searchQuery();
      const handle = window.setTimeout(
        () => this.fetchDocumentsFromServer(q),
        200,
      );
      onCleanup(() => window.clearTimeout(handle));
    });
  }

  // ----------------------------
  // Normalización
  // ----------------------------

  private toUpperValue(value: string | null | undefined): string {
    return String(value || '').toUpperCase();
  }

  onDocumentSearchInput(value: string): void {
    this.searchQuery.set(this.toUpperValue(value));
  }

  onUserSearchInput(value: string): void {
    this.userSearchQuery.set(this.toUpperValue(value));
  }

  onRoleSearchInput(value: string): void {
    this.roleSearchQuery.set(this.toUpperValue(value));
  }

  // ----------------------------
  // Bootstrap
  // ----------------------------

  private bootstrap(): void {
    this.loadUsers();
    this.loadRoles();
    this.fetchDocumentsFromServer('');
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
          this.resetSelectionState();
        }
      },
      error: () => this.loadDocumentsFallback(),
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

  // ----------------------------
  // Labels / helpers
  // ----------------------------

  levelLabel(lv: ConfLevel): string {
    return LEVEL_LABEL[lv];
  }

  currentLevelLabel(): string {
    return LEVEL_LABEL[this.currentLevel()];
  }

  filteredDocuments(): DocumentOption[] {
    const q = this.searchQuery().trim().toUpperCase();

    if (!q) return this.documentOptions();

    return this.documentOptions().filter((d) => {
      const title = String(d.title || '').toUpperCase();
      const code = String(d.code || '').toUpperCase();
      const id = String(d.id || '').toUpperCase();
      const type = String(d.type || '').toUpperCase();
      const unit = String(d.unit || '').toUpperCase();

      return (
        title.includes(q) ||
        code.includes(q) ||
        id.includes(q) ||
        type.includes(q) ||
        unit.includes(q)
      );
    });
  }

  filteredDocumentsCount(): number {
    return this.filteredDocuments().length;
  }

  filteredUsers(): AdminUser[] {
    const q = this.userSearchQuery().trim().toUpperCase();
    const base = this.allUsers();

    if (!q) return base;

    return base.filter((u) => {
      const full = `${u.nombre} ${u.apellido1} ${u.apellido2 || ''}`.toUpperCase();
      const email = String(u.email || '').toUpperCase();
      const unit = String((u as any).unidad || '').toUpperCase();

      return full.includes(q) || email.includes(q) || unit.includes(q);
    });
  }

  filteredUsersCount(): number {
    return this.filteredUsers().length;
  }

  filteredRoles(): RoleRowApi[] {
    const q = this.roleSearchQuery().trim().toUpperCase();
    const base = this.allRoles();

    if (!q) return base;

    return base.filter((r) => {
      const nombre = String(r.nombre || '').toUpperCase();
      const id = String(r.id || '').toUpperCase();

      return nombre.includes(q) || id.includes(q);
    });
  }

  filteredRolesCount(): number {
    return this.filteredRoles().length;
  }

  // ----------------------------
  // Document selection & config load
  // ----------------------------

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
          })),
        );

        this.allowedRoles.set(
          (cfg.roles || []).map((r) => ({
            roleId: Number(r.roleId),
            actions: this.normalizeActions(r.actions),
          })),
        );

        this.toasts.info('Configuration loaded.');
      },
      error: (e) => {
        this.allowedUsers.set([]);
        this.allowedRoles.set([]);
        this.currentLevel.set('PUBLIC');
        this.editLevel.set('PUBLIC');
        this.toasts.error(this.humanHttpError(e, 'Failed to load configuration.'));
      },
      complete: () => this.loading.set(false),
    });
  }

  private resetSelectionState(): void {
    this.selectedDocumentId.set(null);
    this.selectedDocument.set(null);
    this.allowedUsers.set([]);
    this.allowedRoles.set([]);
    this.currentLevel.set('PUBLIC');
    this.editLevel.set('PUBLIC');
  }

  // ----------------------------
  // UI rows
  // ----------------------------

  userRuleRows = computed<UserRuleRow[]>(() => {
    const users = this.allUsers();
    const mapById = new Map<number, AdminUser>(users.map((u) => [u.id, u]));

    return this.allowedUsers().map((u) => {
      const found = mapById.get(u.userId);

      const displayName = found
        ? `${found.nombre} ${found.apellido1}${found.apellido2 ? ' ' + found.apellido2 : ''}`
        : `Usuario #${u.userId}`;

      const email = found?.email || '';
      const unit = ((found as any)?.unidad as string) || '';

      const rawEditorPerms =
        ((found as any)?.editorPermissions as Perm[]) ??
        ((found as any)?.permisosEditor as Perm[]) ??
        [];

      const editorPerms = Array.from(
        new Set((rawEditorPerms || []).filter((p) => p === 'EDIT' || p === 'SIGN')),
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

  // ----------------------------
  // Save config
  // ----------------------------

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
        'Sensitive levels require at least one authorized user or role.',
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
          })),
        );

        this.allowedRoles.set(
          (saved?.roles || dto.roles).map((r) => ({
            roleId: Number(r.roleId),
            actions: this.normalizeActions(r.actions),
          })),
        );

        this.toasts.success('Changes saved.');
      },
      error: (err: unknown) => {
        this.toasts.error(this.humanHttpError(err, 'Failed to save changes.'));
      },
      complete: () => this.saving.set(false),
    });
  }

  private validateAllowLists(
    users: { userId: number; actions: Action[] }[],
    roles: { roleId: number; actions: Action[] }[],
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
          'Validation: each authorized user must have at least one action.',
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
          'Validation: each authorized role must have at least one action.',
        );
        return false;
      }
    }

    return true;
  }

  private normalizeActions(actions: Action[] | string | any): Action[] {
    let arr: any[] = [];

    if (Array.isArray(actions)) arr = actions;
    else if (typeof actions === 'string') {
      arr = actions.split(',').map((s) => s.trim());
    } else {
      arr = [];
    }

    const set = new Set<Action>();

    for (const x of arr) {
      if (x === 'VIEW' || x === 'EDIT' || x === 'SIGN') set.add(x);
    }

    return Array.from(set);
  }

  // ----------------------------
  // Add user modal
  // ----------------------------

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
      cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a],
    );
  }

  isSelectedUserAlreadyAuthorized(): boolean {
    const id = this.selectedUserId();

    return !!id && this.allowedUsers().some((u) => u.userId === id);
  }

  isAddUserDisabled(): boolean {
    const id = this.selectedUserId();
    const actions = this.normalizeActions(this.tempUserActions());

    return !id || actions.length === 0 || this.isSelectedUserAlreadyAuthorized();
  }

  confirmAddUser(): void {
    const id = this.selectedUserId();

    if (!id) return this.toasts.error('Please select a user.');

    if (this.isSelectedUserAlreadyAuthorized()) {
      return this.toasts.error('This user is already authorized.');
    }

    const actions = this.normalizeActions(this.tempUserActions());

    if (actions.length === 0) {
      return this.toasts.error('Select at least one permission.');
    }

    this.allowedUsers.update((arr) => [...arr, { userId: id, actions }]);
    this.closeAddUserModal();
    this.toasts.success('User added to allow-list.');
  }

  async removeUserRule(index: number): Promise<void> {
    const ok = await this.confirm.ask(
      '¿Eliminar este usuario autorizado?',
      'Confirmar eliminación',
    );

    if (!ok) return;

    this.allowedUsers.update((arr) => arr.filter((_, i) => i !== index));
    this.toasts.info('User removed (pending save).');
  }

  // ----------------------------
  // Add role modal
  // ----------------------------

  openAddRoleModal(): void {
    this.isAddRoleOpen.set(true);
    this.roleSearchQuery.set('');
    this.selectedRoleId.set(null);
    this.tempRoleActions.set(['VIEW']);
  }

  closeAddRoleModal(): void {
    this.isAddRoleOpen.set(false);
  }

  toggleTempRoleAction(a: Action): void {
    const cur = this.tempRoleActions();

    this.tempRoleActions.set(
      cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a],
    );
  }

  isSelectedRoleAlreadyAuthorized(): boolean {
    const id = this.selectedRoleId();

    return !!id && this.allowedRoles().some((r) => r.roleId === id);
  }

  isAddRoleDisabled(): boolean {
    const id = this.selectedRoleId();
    const actions = this.normalizeActions(this.tempRoleActions());

    return !id || actions.length === 0 || this.isSelectedRoleAlreadyAuthorized();
  }

  confirmAddRole(): void {
    const id = this.selectedRoleId();

    if (!id) return this.toasts.error('Please select a role.');

    if (this.isSelectedRoleAlreadyAuthorized()) {
      return this.toasts.error('This role is already authorized.');
    }

    const actions = this.normalizeActions(this.tempRoleActions());

    if (actions.length === 0) {
      return this.toasts.error('Select at least one action.');
    }

    this.allowedRoles.update((arr) => [...arr, { roleId: id, actions }]);
    this.closeAddRoleModal();
    this.toasts.success('Role added to allow-list.');
  }

  async removeRoleRule(index: number): Promise<void> {
    const ok = await this.confirm.ask(
      '¿Eliminar este rol autorizado?',
      'Confirmar eliminación',
    );

    if (!ok) return;

    this.allowedRoles.update((arr) => arr.filter((_, i) => i !== index));
    this.toasts.info('Role removed (pending save).');
  }

  // ----------------------------
  // Error formatting
  // ----------------------------

  private humanHttpError(err: any, fallback: string): string {
    const e = err as HttpErrorResponse;

    if (!e) return fallback;

    const msg =
      (typeof e.error === 'string' && e.error) ||
      e.error?.message ||
      e.message ||
      fallback;

    return msg.length > 120 ? msg.slice(0, 117) + '...' : msg;
  }
}
