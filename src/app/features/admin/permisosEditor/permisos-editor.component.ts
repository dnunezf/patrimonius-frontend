import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AdminUsersService, EditorPermission, AdminUser } from '../../../../core/services/admin-users.service';

type Perm = 'EDIT' | 'SIGN'; // 👈 payload solo con estos (sin UPLOAD)
const EDITOR_ID = 2;

interface EditorRow {
  id: number;
  nombre: string;
  apellido1: string;
  apellido2?: string;
  email: string;
  unidad?: string | number;
  rolId: number;
  edit: boolean;
  sign: boolean;
  upload: boolean;     // 👈 nueva propiedad para la casilla "Cargar"
  dirty?: boolean;
  saving?: boolean;
}

@Component({
  selector: 'app-permisos-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './permisos-editor.component.html',
  styleUrls: ['./permisos-editor.component.css'],
})
export class PermisosEditorComponent implements OnInit {
  // estado
  loading = signal(true);
  error = signal<string | null>(null);
  filter = signal('');
  rows = signal<EditorRow[]>([]);
  savingAll = signal(false);

  // vistas derivadas
  filtered = computed(() => {
    const q = this.filter().trim().toLowerCase();
    if (!q) return this.rows();
    return this.rows().filter((r) =>
      `${r.nombre} ${r.apellido1} ${r.apellido2 ?? ''} ${r.email}`
        .toLowerCase()
        .includes(q)
    );
  });

  hasDirty = computed(() => {
    // Verifica si alguna fila tiene cambios no guardados
    return this.rows().some((r) => r.dirty && !r.saving);
  });

  constructor(private usersApi: AdminUsersService) {}

  ngOnInit(): void {
    this.load();
  }

  private mapApiUser(u: AdminUser): EditorRow | null {
    const rolId = (u as any).rolId ?? (u as any).rol_id;
    if (rolId !== EDITOR_ID) return null;

    const perms = (u.editorPermissions ?? []) as EditorPermission[];

    return {
      id: u.id,
      nombre: u.nombre,
      apellido1: u.apellido1,
      apellido2: u.apellido2,
      email: u.email,
      unidad: (u as any).unidadNombre ?? u.unidadId ?? (u as any).unidad_id,
      rolId,
      edit: perms.includes('EDIT'),
      sign: perms.includes('SIGN'),
      upload: false,   // 👈 de momento no viene de API; solo visual
      dirty: false,
      saving: false,
    };
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.usersApi.list().subscribe({
      next: (data: AdminUser[]) => {
        const mapped = (data || [])
          .map((u: AdminUser) => this.mapApiUser(u))
          .filter(Boolean) as EditorRow[];
        this.rows.set(mapped);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        console.error(err);
        this.error.set('No se pudieron cargar los usuarios.');
        this.loading.set(false);
      },
    });
  }

  // 👇 ahora acepta también 'upload'
  toggle(row: EditorRow, key: 'edit' | 'sign' | 'upload') {
    row[key] = !row[key];
    row.dirty = true;
  }

  setAll(val: boolean) {
    this.rows.update((list) =>
      list.map((r) => ({ ...r, edit: val, sign: val, upload: val, dirty: true }))
    );
  }

  habilitar(row: EditorRow) {
    row.edit = true;
    row.sign = true;
    row.upload = true;   // 👈 afecta "Cargar"
    row.dirty = true;
  }

  deshabilitar(row: EditorRow) {
    row.edit = false;
    row.sign = false;
    row.upload = false;  // 👈 afecta "Cargar"
    row.dirty = true;
  }

  guardarFila(row: EditorRow) {
    row.saving = true;
    const payload = this.buildPayload(row);

    this.usersApi.update(row.id, payload).subscribe({
      next: () => {
        row.dirty = false;
        row.saving = false;
      },
      error: (err) => {
        console.error(err);
        row.saving = false;
        alert('Error al guardar permisos del usuario.');
      },
    });
  }

  private buildPayload(row: EditorRow) {
    const permisos: Perm[] = [];
    if (row.edit) permisos.push('EDIT');
    if (row.sign) permisos.push('SIGN');
    // 👈 NO enviamos 'UPLOAD' para evitar el error de payload
    return { permisosEditor: permisos };
  }

  guardarTodos() {
    const sucios = this.rows().filter((r) => r.dirty && !r.saving);
    if (!sucios.length) return;

    this.savingAll.set(true);

    const saveNext = (i: number) => {
      if (i >= sucios.length) {
        this.savingAll.set(false);
        return;
      }
      const r = sucios[i];
      r.saving = true;
      this.usersApi.update(r.id, this.buildPayload(r)).subscribe({
        next: () => {
          r.dirty = false;
          r.saving = false;
          saveNext(i + 1);
        },
        error: (err: unknown) => {
          console.error(err);
          r.saving = false;
          this.savingAll.set(false);
          alert(`Error al guardar permisos de ${r.nombre}.`);
        },
      });
    };

    saveNext(0);
  }
}
