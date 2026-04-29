// src/app/admin/catalogos/catalogo-roles/catalogo-roles.component.ts
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { CatalogosService, Rol } from '../../../../../core/services/catalogos.service';

@Component({
  selector: 'app-catalogo-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalogo-roles.component.html',
  styleUrls: ['./catalogo-roles.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoRolesComponent implements OnInit {
  roles$!: Observable<Rol[]>;

  form: Partial<Rol> = {
    nombreRol: '',
    descripcion: '',
  };

  editing: Rol | null = null;
  saving = false;
  errorMessage = '';

  searchTerm = '';

  // ✅ Modal eliminar
  showDeleteModal = false;
  deleting: Rol | null = null;
  deletingBusy = false;

  // ✅ Paginación frontend
  page = 1;
  pageSize = 10;

  constructor(
    private api: CatalogosService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.api.loadRoles();
    this.roles$ = this.api.roles$;
  }

  // ====== Normalización ======

  private toUpperValue(value: string | null | undefined): string {
    return String(value || '').toUpperCase();
  }

  onNombreRolInput(): void {
    this.form.nombreRol = this.toUpperValue(this.form.nombreRol);
  }

  onDescripcionInput(): void {
    this.form.descripcion = this.toUpperValue(this.form.descripcion);
  }

  onSearchInput(): void {
    this.searchTerm = this.toUpperValue(this.searchTerm);
    this.resetPage();
  }

  filteredRoles(roles: Rol[]): Rol[] {
    const term = this.searchTerm.trim().toUpperCase();

    if (!term) return roles ?? [];

    return (roles ?? []).filter((rol) => {
      const nombre = String(rol.nombreRol || '').toUpperCase();
      const descripcion = String(rol.descripcion || '').toUpperCase();

      return nombre.includes(term) || descripcion.includes(term);
    });
  }

  // ====== Paginación helpers ======

  totalPages(totalItems: number): number {
    return Math.max(1, Math.ceil((totalItems || 0) / this.pageSize));
  }

  paged<T>(list: T[]): T[] {
    const start = (this.page - 1) * this.pageSize;
    return (list ?? []).slice(start, start + this.pageSize);
  }

  goPrev(totalItems: number): void {
    this.page = Math.max(1, this.page - 1);
  }

  goNext(totalItems: number): void {
    const tp = this.totalPages(totalItems);
    this.page = Math.min(tp, this.page + 1);
  }

  ensureValidPage(totalItems: number): false {
    const tp = this.totalPages(totalItems);

    if (this.page > tp) this.page = tp;
    if (this.page < 1) this.page = 1;

    return false;
  }

  resetPage(): void {
    this.page = 1;
  }

  // ====== CRUD ======

  submit(): void {
    if (!this.form.nombreRol?.trim()) return;

    this.form = {
      ...this.form,
      nombreRol: this.toUpperValue(this.form.nombreRol).trim(),
      descripcion: this.toUpperValue(this.form.descripcion).trim(),
    };

    this.saving = true;
    this.errorMessage = '';

    if (this.editing) {
      this.api.updateRol(this.editing.idRol, this.form).subscribe({
        next: () => {
          this.saving = false;
          this.cancel();
          this.resetPage();
          this.cdr.markForCheck();
        },
        error: () => {
          this.saving = false;
          this.errorMessage = 'Error actualizando rol';
          this.cdr.markForCheck();
        },
      });
    } else {
      this.api.createRol(this.form).subscribe({
        next: () => {
          this.saving = false;
          this.form = { nombreRol: '', descripcion: '' };
          this.resetPage();
          this.cdr.markForCheck();
        },
        error: () => {
          this.saving = false;
          this.errorMessage = 'Error creando rol';
          this.cdr.markForCheck();
        },
      });
    }
  }

  edit(r: Rol): void {
    this.editing = r;
    this.form = {
      nombreRol: this.toUpperValue(r.nombreRol),
      descripcion: this.toUpperValue(r.descripcion),
    };
  }

  cancel(): void {
    this.editing = null;
    this.form = {
      nombreRol: '',
      descripcion: '',
    };
  }

  openDelete(r: Rol): void {
    this.deleting = r;
    this.showDeleteModal = true;
    this.deletingBusy = false;
    this.errorMessage = '';
    this.cdr.markForCheck();
  }

  closeDelete(): void {
    this.showDeleteModal = false;
    this.deleting = null;
    this.deletingBusy = false;
    this.cdr.markForCheck();
  }

  confirmDelete(): void {
    if (!this.deleting) return;

    this.deletingBusy = true;
    this.cdr.markForCheck();

    this.api.deleteRol(this.deleting.idRol).subscribe({
      next: () => {
        this.deletingBusy = false;
        this.closeDelete();
        this.resetPage();
        this.cdr.markForCheck();
      },
      error: () => {
        this.deletingBusy = false;
        this.errorMessage =
          'No se pudo eliminar el rol (puede estar asignado a usuarios).';
        this.cdr.markForCheck();
      },
    });
  }

  trackById = (_: number, it: Rol) => it.idRol;
}
