import { Component, computed, signal } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ConfidentialityService,
  ConfLevel,
  Action,
  ConfDto,
} from '../../../../core/services/confidentiality.service';
import {
  AuditService,
  AuditItem,
} from '../../../../core/services/audit.service';

/** Local row models only for UI rendering */
type UserRow = {
  userId: number;
  email: string;
  name: string;
  actions: Action[];
};
type RoleRow = { roleId: number; label: string; actions: Action[] };

/** Map engine levels -> Spanish label shown to the user */
const LEVEL_LABEL: Record<ConfLevel, string> = {
  PUBLIC: 'Público',
  INTERNAL: 'Interno',
  HIGH: 'Alto',
  RESTRICTED: 'Restringido',
};

/** Spanish labels for action chips */
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
  // ---------- UI state ----------
  activeTab = signal<'control' | 'log'>('control');
  loading = signal(false);
  saving = signal(false);

  // ---------- Document selection ----------
  search = signal('');
  selectedDocId = signal<number | null>(null);

  // NOTE: Replace with real search results when documents API is ready
  docOptions = signal<{ id: number; title: string }[]>([
    { id: 1, title: 'Acta de Junta Directiva - Enero 2025' },
    { id: 2, title: 'Presupuesto Institucional 2025' },
    { id: 3, title: 'Informe de Conservación - Dic 2024' },
  ]);

  // ---------- Confidentiality config model ----------
  level = signal<ConfLevel>('PUBLIC');
  userRows = signal<UserRow[]>([]);
  roleRows = signal<RoleRow[]>([]);

  // ---------- Log tab state ----------
  logLoading = signal(false);
  logItems = signal<AuditItem[]>([]);
  logPeriod = signal<'24h' | '7d' | '30d'>('24h');
  logResult = signal<'ALL' | 'PERMITTED' | 'DENIED'>('ALL'); // Spanish labels are in template
  logAction = signal<'ALL' | Action>('ALL');

  // ---------- Derived counters for the top metrics ----------
  /** Count 1 if the current document level is sensitive (HIGH/RESTRICTED). */
  highCount = computed(() =>
    this.level() === 'HIGH' || this.level() === 'RESTRICTED' ? 1 : 0
  );

  /** Number of user rows configured (for metric card). */
  usersWithPerms = computed(() => this.userRows().length);

  constructor(
    private confSvc: ConfidentialityService,
    private audit: AuditService
  ) {}

  // ---------- Control tab actions ----------
  /** Pull current config for selected document. */
  loadConfig(): void {
    const id = this.selectedDocId();
    if (!id) return;
    this.loading.set(true);
    this.confSvc.getConfig(id).subscribe({
      next: (cfg) => {
        this.level.set(cfg.level);
        this.userRows.set(
          (cfg.users || []).map((u) => ({
            userId: u.userId,
            email: '',
            name: '',
            actions: u.actions,
          }))
        );
        this.roleRows.set(
          (cfg.roles || []).map((r) => ({
            roleId: r.roleId,
            label: '',
            actions: r.actions,
          }))
        );
      },
      error: () => {},
      complete: () => this.loading.set(false),
    });
  }

  /** Add/remove row helpers */
  addUser(): void {
    this.userRows.update((a) => [
      ...a,
      { userId: 0, email: '', name: '', actions: ['VIEW'] },
    ]);
  }
  removeUser(i: number): void {
    this.userRows.update((a) => a.filter((_, idx) => idx !== i));
  }
  addRole(): void {
    this.roleRows.update((a) => [
      ...a,
      { roleId: 0, label: '', actions: ['VIEW'] },
    ]);
  }
  removeRole(i: number): void {
    this.roleRows.update((a) => a.filter((_, idx) => idx !== i));
  }

  /** Toggle a single action within a list (immutably). */
  toggleAction(list: Action[], a: Action): Action[] {
    return list.includes(a) ? list.filter((x) => x !== a) : [...list, a];
  }

  /** Persist configuration to backend. */
  save(): void {
    const id = this.selectedDocId();
    if (!id) return;
    this.saving.set(true);

    const dto: ConfDto = {
      level: this.level(),
      users: this.userRows()
        .filter((u) => u.userId > 0)
        .map((u) => ({ userId: u.userId, actions: u.actions })),
      roles: this.roleRows()
        .filter((r) => r.roleId > 0)
        .map((r) => ({ roleId: r.roleId, actions: r.actions })),
    };

    this.confSvc.setConfig(id, dto).subscribe({
      next: () => {},
      error: () => {},
      complete: () => this.saving.set(false),
    });
  }

  // ---------- Log tab ----------
  /** Fetches audit page using Spanish-select values mapped to API filters. */
  loadLog(): void {
    this.logLoading.set(true);

    // Build filters expected by the backend API
    const filters: Record<string, string> = {};
    if (this.logResult() === 'PERMITTED') filters['resultado'] = 'OK';
    if (this.logResult() === 'DENIED') filters['resultado'] = 'DENIED';
    if (this.logAction() !== 'ALL')
      filters['accion_solicitada'] = this.logAction();

    this.audit
      .listEvents({
        page: 1,
        pageSize: 25,
        ...filters,
        sortBy: 'fecha_hora',
        sortDir: 'desc', // our AuditService allows 'asc' | 'desc'
      })
      .subscribe({
        next: (page) => this.logItems.set(page.items || []),
        error: () => {},
        complete: () => this.logLoading.set(false),
      });
  }

  // ---------- Helpers ----------
  /** Spanish label for a given level code. */
  levelLabel(lv: ConfLevel): string {
    return LEVEL_LABEL[lv];
  }

  /** Spanish label for a given action code. */
  actionLabel(a: Action): string {
    return ACTION_LABEL[a];
  }

  /** Simple client-side filter for the document combo. */
  filteredDocs() {
    const q = this.search().toLowerCase();
    return this.docOptions().filter((d) => d.title.toLowerCase().includes(q));
  }
}
