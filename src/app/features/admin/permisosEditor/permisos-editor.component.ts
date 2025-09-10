import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminUsersService,EditorPermission,AdminUser } from '../../../../core/services/admin-users.service';

type Perm = 'EDIT' | 'SIGN';
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
  loading = signal(true);
  error = signal<string | null>(null);
  filter = signal('');
  rows = signal<EditorRow[]>([]);
  savingAll = signal(false);

  filtered = computed(() => {
    const q = this.filter().trim().toLowerCase();
    if (!q) return this.rows();
    return this.rows().filter(r =>
      `${r.nombre} ${r.apellido1} ${r.apellido2 ?? ''} ${r.email}`.toLowerCase().includes(q)
    );
  });

  constructor(private usersApi: AdminUsersService) {}

  ngOnInit(): void { this.load(); }

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
      dirty: false,
      saving: false,
    };
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.usersApi.list().subscribe({
      next: (data) => {
        const mapped = (data || [])
          .map(u => this.mapApiUser(u))
          .filter(Boolean) as EditorRow[];
        this.rows.set(mapped);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('No se pudieron cargar los usuarios.');
        this.loading.set(false);
      },
    });
  }

  toggle(row: EditorRow, key: 'edit' | 'sign') { row[key] = !row[key]; row.dirty = true; }
  setAll(val: boolean) { this.rows.update(list => list.map(r => ({ ...r, edit: val, sign: val, dirty: true }))); }
  habilitar(row: EditorRow) { row.edit = row.sign = true; row.dirty = true; }
  deshabilitar(row: EditorRow) { row.edit = row.sign = false; row.dirty = true; }

  private buildPayload(row: EditorRow) {
    const permisos: EditorPermission[] = [];
    if (row.edit) permisos.push('EDIT');
    if (row.sign) permisos.push('SIGN');
    return { editorPermissions: permisos }; // <- nombre del DTO en tu AdminUsersService
  }

  guardarFila(row: EditorRow) {
    row.saving = true;
    this.usersApi.update(row.id, this.buildPayload(row)).subscribe({
      next: () => { row.dirty = false; row.saving = false; },
      error: (err) => { console.error(err); row.saving = false; alert('Error al guardar permisos del usuario.'); },
    });
  }

  guardarTodos() {
    const sucios = this.rows().filter(r => r.dirty && !r.saving);
    if (!sucios.length) return;
    this.savingAll.set(true);

    const saveNext = (i: number) => {
      if (i >= sucios.length) { this.savingAll.set(false); return; }
      const r = sucios[i]; r.saving = true;
      this.usersApi.update(r.id, this.buildPayload(r)).subscribe({
        next: () => { r.dirty = false; r.saving = false; saveNext(i + 1); },
        error: (err) => { console.error(err); r.saving = false; this.savingAll.set(false); alert(`Error al guardar permisos de ${r.nombre}.`); },
      });
    };
    saveNext(0);
  }
}
