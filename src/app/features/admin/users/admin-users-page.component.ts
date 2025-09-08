import { Component, Signal, computed, effect, signal } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ← FIX
import { RouterLink } from '@angular/router';
import {
  AdminUsersService,
  AdminUser,
  UpsertUserDto,
} from '../../../../core/services/admin-users.service';
import { UserFormDialogComponent } from './user-form-dialog.component';
import { EDITOR_ID, ROLES, UNIDADES } from '../../../shared/data/catalogs';

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
  ], // ← FIX
  templateUrl: './admin-users-page.component.html',
  styleUrls: ['./admin-users-page.component.css'],
})
export class AdminUsersPageComponent {
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

  constructor(private api: AdminUsersService) {
    effect(() => void this.load());
  }

  load(): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (list: AdminUser[]) => {
        this.users.set(list);
        this.loading.set(false);
      },
      error: (e: any) => {
        this.error.set(e?.error?.message || 'Failed to load users');
        this.loading.set(false);
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

  delete(u: AdminUser): void {
    if (!confirm(`Eliminar al usuario ${u.nombre} ${u.apellido1}?`)) return;
    this.api.remove(u.id).subscribe({
      next: () => this.load(),
      error: (e: any) => alert(e?.error?.message || 'No se pudo eliminar'),
    });
  }

  onSubmit(data: UpsertUserDto, editedId?: number): void {
    const req = editedId
      ? this.api.update(editedId, data)
      : this.api.create(data);
    req.subscribe({
      next: () => {
        this.showForm.set(false);
        this.load();
      },
      error: (e: any) => alert(e?.error?.message || 'Operación no completada'),
    });
  }
}
