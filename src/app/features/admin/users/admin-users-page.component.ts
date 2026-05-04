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
import { ChangeDetectorRef } from '@angular/core';
import { finalize, timeout, catchError, throwError } from 'rxjs';
import { CatalogosService, Rol } from '../../../../core/services/catalogos.service';

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
  readonly isBusy = signal(false);

  readonly filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    const role = this.roleFilter();
    return this.users().filter((u) => {
      const hit =
        !q ||
        `${u.nombre} ${u.apellido1} ${u.apellido2 ?? ''} ${u.email} ${u.unidad}`
          .toLowerCase()
          .includes(q);

      if (role === 'all') return hit;

      const hasPrimary = u.rolId === role;
      const hasMulti =
        Array.isArray(u.rolIds) && u.rolIds.some((id: number) => id === role);

      return hit && (hasPrimary || hasMulti);
    });
  });

  readonly totalCount = computed(() => this.users().length);
  readonly editorsCount = computed(
    () => this.users().filter((u) => u.rolId === EDITOR_ID).length,
  );

  roleOptions = signal<{ id: number; label: string }[]>([...ROLES]);
  readonly UNIDADES = UNIDADES;
  readonly EDITOR_ID = EDITOR_ID;

  constructor(
    private api: AdminUsersService,
    private catalogosApi: CatalogosService,
    private toast: ToastService,
    private confirm: ConfirmService,
    private cd: ChangeDetectorRef,
  ) {
    effect(() => void this.load());
    effect(() => void this.loadRoles());
  }

  private loadRoles(): void {
    this.catalogosApi.loadRoles();
    this.catalogosApi.roles$.subscribe({
      next: (roles: Rol[]) => {
        const mapped = (roles || [])
          .map((r) => ({
            id: Number(r.idRol),
            label: String(r.nombreRol || '').trim(),
          }))
          .filter((r) => Number.isInteger(r.id) && r.id > 0 && !!r.label);

        if (mapped.length) {
          this.roleOptions.set(mapped);
        }
      },
    });
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
      '¿Desea desactivar este usuario? Su cuenta quedará inactiva y no podrá iniciar sesión, pero sus registros se conservarán.',
      'Confirmar desactivación',
    );
    if (!ok) return;
    this.api.remove(u.id).subscribe({
      next: () => {
        this.toast.success('Usuario desactivado');
        this.load();
      },
      error: (e) => {
        this.toast.error(e?.error?.message || 'No se pudo eliminar');
      },
    });
  }

  /** Create/Update flow with success + error toasts and dialog auto-close. */
  /** Create/Update without reload. Cierra el modal y parchea la lista. */
  onSubmit(evtOrData: any, editedId?: number): void {
    // Accept either:
    // 1) (submit)="onSubmit($event)"  where $event = { data, id }
    // 2) (submit)="onSubmit($event.data, $event.id)"
    // 3) dialog emits the DTO directly (data-only)

    const inferredId =
      (evtOrData && typeof evtOrData === 'object' && 'id' in evtOrData
        ? Number(evtOrData.id)
        : undefined) ?? editedId;

    const inferredData = (
      evtOrData && typeof evtOrData === 'object' && 'data' in evtOrData
        ? evtOrData.data
        : evtOrData
    ) as UpsertUserDto;

     if (!inferredData) return;

    this.isBusy.set(true);

    const req = inferredId
      ? this.api.update(inferredId, inferredData)
      : this.api.create(inferredData);

    const REQUEST_TIMEOUT_MS = 15000;

    req
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        catchError((err) => {
          if (err?.name === 'TimeoutError') {
            return throwError(() => ({ status: -1, error: { message: 'La operación tardó demasiado. Intente de nuevo.' } }));
          }
          return throwError(() => err);
        }),
        finalize(() => this.isBusy.set(false)),
      )
      .subscribe({
        next: (saved) => {
          this.showForm.set(false);
          if (inferredId) {
            this.users.update((list) =>
              list.map((u) => (u.id === saved.id ? saved : u)),
            );
            this.toast.success('Cambios guardados');
          } else {
            this.users.update((list) => [saved, ...list]);
            this.toast.success('Usuario creado');
          }
          this.highlight(saved.id);
          this.cd.markForCheck();
        },
        error: (e) => {
          const customMsg = e?.error?.message;
          const msg =
            e?.status === 409
              ? 'Este correo ya está asociado a otra cuenta.'
              : e?.status === 422
                ? 'Revise los datos ingresados. Solo se permiten caracteres válidos en nombre, apellidos y correo.'
                : e?.status === 400
                  ? customMsg || 'Datos inválidos'
                  : typeof customMsg === 'string' && customMsg
                    ? customMsg
                    : e?.status === 0 || e?.status === -1
                      ? 'No se pudo conectar. Intente de nuevo.'
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
