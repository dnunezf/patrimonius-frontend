import { Component, Signal, computed, effect, signal } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AdminUsersService,
  AdminUser,
  UpsertUserDto,
} from '../../../../core/services/admin-users.service';
import { UserFormDialogComponent } from './user-form-dialog.component';
import { EDITOR_ID, ROLES, UNIDADES } from '../../../shared/data/catalogs';
import { ToastService } from '../../../shared/ui/toast.service';
import { ConfirmService } from '../../../shared/ui/confirm.service';

/** Admin Users page: now uses ToastService (success/error) and ConfirmService (delete). */
@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgFor,
    NgIf,
    RouterLink,
    UserFormDialogComponent,
  ],
  templateUrl: './admin-users-page.component.html',
  styleUrls: ['./admin-users-page.component.css'],
})
export class AdminUsersPageComponent {
  readonly highlightId = signal<number | null>(null);

  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly query = signal<string>('');
  readonly roleFilter = signal<number | 'all'>('all');
  readonly showForm = signal<boolean>(false);
  readonly editing = signal<AdminUser | null>(null);

  readonly filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    const role = this.roleFilter();
    return this.users().filter((u) => {
      const hit =
        !q ||
        `${u.nombre} ${u.apellido1} ${u.apellido2 ?? ''} ${u.email} ${u.unidad}`
          .toLowerCase()
          .includes(q);
      const roleOk = role === 'all' || u.rolId === role;
      return hit && roleOk;
    });
  });

  readonly totalCount = computed(() => this.users().length);
  readonly editorsCount = computed(
    () => this.users().filter((u) => u.rolId === EDITOR_ID).length
  );

  readonly ROLES = ROLES;
  readonly UNIDADES = UNIDADES;
  readonly EDITOR_ID = EDITOR_ID;

  constructor(
    private api: AdminUsersService,
    private toast: ToastService,
    private confirm: ConfirmService
  ) {
    effect(() => void this.load());
  }

  load(): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (list) => {
        this.users.set(list);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.error?.message || 'Failed to load users');
        this.loading.set(false);
        this.toast.error('No se pudo cargar usuarios');
      },
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.showForm.set(true);
  }
  openEdit(u: AdminUser): void {
    this.editing.set(u);
    this.showForm.set(true);
  }

  roleClass(name?: string): string {
    const n = (name || '').toUpperCase();
    if (n.startsWith('ADMIN')) return 'admin';
    if (n.startsWith('EDITOR')) return 'editor';
    if (n.startsWith('ARCH')) return 'arch';
    if (n.includes('EXTERNO')) return 'ext';
    if (n.startsWith('USU')) return 'user';
    return '';
  }

  /** Delete flow now asks confirmation and toasts the result (no window.confirm/alert). */
  async delete(u: AdminUser): Promise<void> {
    const ok = await this.confirm.ask(
      `Eliminar al usuario ${u.nombre} ${u.apellido1}?`,
      'Confirmar eliminación'
    );
    if (!ok) return;
    this.api.remove(u.id).subscribe({
      next: () => {
        this.toast.success('Usuario eliminado');
        this.load();
      },
      error: (e) => {
        this.toast.error(e?.error?.message || 'No se pudo eliminar');
      },
    });
  }

  /** Create/Update flow with success + error toasts and dialog auto-close. */
  onSubmit(data: UpsertUserDto, editedId?: number): void {
    const req = editedId
      ? this.api.update(editedId, data)
      : this.api.create(data);

    req.subscribe({
      next: (saved) => {
        this.showForm.set(false);
        this.toast.success(editedId ? 'Cambios guardados' : 'Usuario creado');

        if (editedId) {
          this.users.update((arr) =>
            arr.map((u) => (u.id === editedId ? (saved as AdminUser) : u))
          );
        } else {
          this.users.update((arr) => [saved as AdminUser, ...arr]);
        }
      },
      error: (e) => {
        const msg =
          e?.status === 409
            ? 'El correo ya existe'
            : e?.status === 400
            ? e?.error?.message || 'Datos inválidos'
            : 'Operación no completada';
        this.toast.error(msg);
      },
    });
  }

  private highlight(id: number) {
    this.highlightId.set(id);
    setTimeout(() => this.highlightId.set(null), 1200);
  }
}
