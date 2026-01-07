import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  ConfidentialityService,
  ConfLevel,
  Action,
  ConfDto,
  ConfConfig,
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
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

type RoleRowApi = { id: number; nombre: string };

type DocumentOption = {
  id: number;
  code: string;
  title: string;
  type?: string | null;
  unit?: string | null;
  unitId?: number | null;
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

const ACTION_LABEL: Record<Action, string> = {
  VIEW: 'Ver',
  EDIT: 'Editar',
  SIGN: 'Firmar',
};

@Component({
  selector: 'app-admin-confidentiality-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgIf, NgFor],
  templateUrl: './admin-confidentiality-page.component.html',
  styleUrls: ['./admin-confidentiality-page.component.css'],
})
export class AdminConfidentialityPageComponent {
  // ---------------- UI state ----------------
  activeTab = signal<'control' | 'log'>('control');
  saving = signal(false);
  loading = signal(false);
  uiMessage = signal<string>('');

  // ---------------- Documents ----------------
  searchQuery = signal<string>('');
  selectedDocumentId = signal<number | null>(null);
  selectedDocument = signal<DocumentOption | null>(null);
  documentOptions = signal<DocumentOption[]>([]);

  // ---------------- Config state (server vs edit) ----------------
  currentLevel = signal<ConfLevel>('PUBLIC'); // what server has
  editLevel = signal<ConfLevel>('PUBLIC'); // what user edits

  allowedUsers = signal<{ userId: number; actions: Action[] }[]>([]);
  allowedRoles = signal<{ roleId: number; actions: Action[] }[]>([]);

  // ---------------- Reference data ----------------
  allUsers = signal<AdminUser[]>([]);
  allRoles = signal<RoleRowApi[]>([]);

  // ---------------- Metrics (best-effort) ----------------
  sensitiveDocsCount = computed(
    () =>
      this.documentOptions().filter(
        (d) => (d as any).level === 'HIGH' || (d as any).level === 'RESTRICTED'
      ).length
  );
  denied24hCount = signal<number>(0); // optional: wire with backend stats later
  allowedUsersCount = computed(() => this.allowedUsers().length);

  // ---------------- Log tab ----------------
  logLoading = signal(false);
  logItems = signal<AuditItem[]>([]);
  logPeriod = signal<'24h' | '7d' | '30d'>('24h');
  logResult = signal<'ALL' | 'PERMITTED' | 'DENIED'>('ALL');
  logAction = signal<'ALL' | Action>('ALL');
  logEventType = signal<'ALL' | 'ACCESS' | 'CONFIG'>('ALL');

  // ---------------- Add user modal ----------------
  isAddUserOpen = signal(false);
  userSearchQuery = signal('');
  selectedUserId = signal<number | null>(null);
  tempUserActions = signal<Action[]>(['VIEW']);

  // ---------------- Add role modal ----------------
  isAddRoleOpen = signal(false);
  selectedRoleId = signal<number | null>(null);
  tempRoleActions = signal<Action[]>(['VIEW']);

  // ---------------- Editor permissions modal ----------------
  isEditorPermsOpen = signal(false);
  editorPermsUserId = signal<number | null>(null);
  tempEditorPerms = signal<Perm[]>(['EDIT']);
  editorPermsSaving = signal(false);

  constructor(
    private confSvc: ConfidentialityService,
    private auditSvc: AuditService,
    private accessCtrl: AccessControlService,
    private adminUsers: AdminUsersService,
    private http: HttpClient
  ) {
    this.bootstrap();
    // keep selectedDocument in sync with selectedDocumentId/options
    effect(() => {
      const id = this.selectedDocumentId();
      const doc = this.documentOptions().find((d) => d.id === id) || null;
      this.selectedDocument.set(doc);
    });
  }

  // ---------------- Bootstrap ----------------
  private bootstrap(): void {
    this.loadUsers();
    this.loadRoles();
    this.loadDocuments();
  }

  private loadUsers(): void {
    this.adminUsers.list().subscribe({
      next: (u) => this.allUsers.set(u || []),
      error: () => this.allUsers.set([]),
    });
  }

  private loadRoles(): void {
    // backend already has /admin/roles in your project; this is a minimal fetch
    this.http.get<RoleRowApi[]>(`${environment.apiUrl}/admin/roles`).subscribe({
      next: (r) => this.allRoles.set(r || []),
      error: () => this.allRoles.set([]),
    });
  }

  private loadDocuments(): void {
    // Use your existing endpoint: GET /documents/control-acceso (already in project)
    // We just need a list for the picker.
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
        }));
        this.documentOptions.set(options);
      },
      error: () => this.documentOptions.set([]),
    });
  }

  // ---------------- Template helpers ----------------
  levelLabel(lv: ConfLevel): string {
    return LEVEL_LABEL[lv];
  }

  actionLabel(a: Action): string {
    return ACTION_LABEL[a];
  }

  currentLevelLabel(): string {
    return LEVEL_LABEL[this.currentLevel()];
  }

  filteredDocuments(): DocumentOption[] {
    const q = (this.searchQuery() || '').trim().toLowerCase();
    if (!q) return this.documentOptions();
    return this.documentOptions().filter((d) => {
      return (
        d.title.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        String(d.id).includes(q) ||
        (d.type || '').toLowerCase().includes(q)
      );
    });
  }

  filteredUsers(): AdminUser[] {
    const q = (this.userSearchQuery() || '').trim().toLowerCase();
    const base = this.allUsers();
    if (!q) return base;
    return base.filter((u) => {
      const full = `${u.nombre} ${u.apellido1} ${
        u.apellido2 || ''
      }`.toLowerCase();
      const unit = (u.unidad || '').toLowerCase();
      return (
        full.includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        unit.includes(q)
      );
    });
  }

  // ---------------- Select document ----------------
  onSelectDocument(id: any): void {
    const parsed = Number(id);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    this.selectedDocumentId.set(parsed);
    this.loadConfig(parsed);
  }

  private loadConfig(docId: number): void {
    this.loading.set(true);
    this.uiMessage.set('');

    this.confSvc.getConfig(docId).subscribe({
      next: (cfg: ConfConfig) => {
        const level = cfg?.level || 'PUBLIC';
        this.currentLevel.set(level);
        this.editLevel.set(level);

        this.allowedUsers.set(
          (cfg.users || []).map((u) => ({
            userId: u.userId,
            actions: this.normalizeActions(u.actions),
          }))
        );
        this.allowedRoles.set(
          (cfg.roles || []).map((r) => ({
            roleId: r.roleId,
            actions: this.normalizeActions(r.actions),
          }))
        );
      },
      error: () => {
        this.uiMessage.set('Failed to load configuration. Please try again.');
        this.allowedUsers.set([]);
        this.allowedRoles.set([]);
        this.currentLevel.set('PUBLIC');
        this.editLevel.set('PUBLIC');
      },
      complete: () => this.loading.set(false),
    });
  }

  // ---------------- Rules table view models ----------------
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
      const unit = found?.unidad || '';

      const editorPerms = (found?.editorPermissions || []) as Perm[];
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

  // ---------------- Save (validated) ----------------
  saveConfig(): void {
    const docId = this.selectedDocumentId();
    if (!docId) return;

    this.uiMessage.set('');

    const level = this.editLevel();
    const users = this.allowedUsers();
    const roles = this.allowedRoles();

    // Validation: for sensitive levels require at least one explicit allow (user or role)
    const isSensitive =
      level === 'INTERNAL' || level === 'HIGH' || level === 'RESTRICTED';
    if (isSensitive && users.length === 0 && roles.length === 0) {
      this.uiMessage.set(
        'Validation error: sensitive levels require at least one authorized user or role.'
      );
      return;
    }

    // Validation: ensure each entry has actions and no duplicates
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
        this.currentLevel.set(saved.level);
        this.editLevel.set(saved.level);
      },
      error: () =>
        this.uiMessage.set(
          'Failed to save changes. Please verify inputs and try again.'
        ),
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
        this.uiMessage.set(
          'Validation error: userId must be a positive number.'
        );
        return false;
      }
      if (userIds.has(u.userId)) {
        this.uiMessage.set('Validation error: duplicate user in allow-list.');
        return false;
      }
      userIds.add(u.userId);

      const a = this.normalizeActions(u.actions);
      if (a.length === 0) {
        this.uiMessage.set(
          'Validation error: each authorized user must have at least one action.'
        );
        return false;
      }
    }

    const roleIds = new Set<number>();
    for (const r of roles) {
      if (!Number.isFinite(r.roleId) || r.roleId <= 0) {
        this.uiMessage.set(
          'Validation error: roleId must be a positive number.'
        );
        return false;
      }
      if (roleIds.has(r.roleId)) {
        this.uiMessage.set('Validation error: duplicate role in allow-list.');
        return false;
      }
      roleIds.add(r.roleId);

      const a = this.normalizeActions(r.actions);
      if (a.length === 0) {
        this.uiMessage.set(
          'Validation error: each authorized role must have at least one action.'
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

  // ---------------- Add/Remove user rules (modal) ----------------
  openAddUserModal(): void {
    this.uiMessage.set('');
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

  confirmAddUser(): void {
    const id = this.selectedUserId();
    if (!id) {
      this.uiMessage.set('Validation error: please select a user.');
      return;
    }
    const actions = this.normalizeActions(this.tempUserActions());
    if (actions.length === 0) {
      this.uiMessage.set('Validation error: select at least one permission.');
      return;
    }

    const exists = this.allowedUsers().some((u) => u.userId === id);
    if (exists) {
      this.uiMessage.set('Validation error: this user is already authorized.');
      return;
    }

    this.allowedUsers.update((arr) => [...arr, { userId: id, actions }]);
    this.closeAddUserModal();
  }

  removeUserRule(index: number): void {
    this.allowedUsers.update((arr) => arr.filter((_, i) => i !== index));
  }

  // ---------------- Add/Remove role rules (modal) ----------------
  openAddRoleModal(): void {
    this.uiMessage.set('');
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

  confirmAddRole(): void {
    const id = this.selectedRoleId();
    if (!id) {
      this.uiMessage.set('Validation error: please select a role.');
      return;
    }
    const actions = this.normalizeActions(this.tempRoleActions());
    if (actions.length === 0) {
      this.uiMessage.set('Validation error: select at least one action.');
      return;
    }

    const exists = this.allowedRoles().some((r) => r.roleId === id);
    if (exists) {
      this.uiMessage.set('Validation error: this role is already authorized.');
      return;
    }

    this.allowedRoles.update((arr) => [...arr, { roleId: id, actions }]);
    this.closeAddRoleModal();
  }

  removeRoleRule(index: number): void {
    this.allowedRoles.update((arr) => arr.filter((_, i) => i !== index));
  }

  // ---------------- Log ----------------
  loadLog(): void {
    this.logLoading.set(true);
    this.uiMessage.set('');

    const filters: Record<string, string> = {};

    if (this.logResult() === 'PERMITTED') filters['resultado'] = 'OK';
    if (this.logResult() === 'DENIED') filters['resultado'] = 'DENIED';
    if (this.logAction() !== 'ALL')
      filters['accion_solicitada'] = this.logAction();

    // Optional if backend supports it
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
        error: () => this.uiMessage.set('Failed to load audit log.'),
        complete: () => this.logLoading.set(false),
      });
  }

  // ---------------- Editor permissions modal ----------------
  openEditorPermsModal(userId: number): void {
    this.uiMessage.set('');
    this.editorPermsUserId.set(userId);

    const u = this.allUsers().find((x) => x.id === userId);
    const perms = (u?.editorPermissions || []) as Perm[];
    const normalized = Array.from(
      new Set(perms.filter((p) => p === 'EDIT' || p === 'SIGN'))
    ) as Perm[];
    this.tempEditorPerms.set(normalized.length ? normalized : ['EDIT']);

    this.isEditorPermsOpen.set(true);
  }

  closeEditorPermsModal(): void {
    this.isEditorPermsOpen.set(false);
  }

  editorPermsUserLabel(): string {
    const id = this.editorPermsUserId();
    const u = this.allUsers().find((x) => x.id === id);
    if (!u) return '';
    return `${u.nombre} ${u.apellido1}`;
  }

  editorPermsRoleLabel(): string {
    // best effort; you can refine if roles are N:M in UI
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
    );
    this.editorPermsSaving.set(true);

    // Use your existing compatibility path: { permisosEditor: Perm[] }
    this.adminUsers.update(id, { permisosEditor: perms as Perm[] }).subscribe({
      next: (updated) => {
        // update local cache
        this.allUsers.update((arr) =>
          arr.map((u) =>
            u.id === id
              ? {
                  ...u,
                  editorPermissions:
                    (updated as any).editorPermissions ?? perms,
                }
              : u
          )
        );
        this.closeEditorPermsModal();
      },
      error: () => this.uiMessage.set('Failed to update editor permissions.'),
      complete: () => this.editorPermsSaving.set(false),
    });
  }
}
