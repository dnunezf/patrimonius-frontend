// src/app/admin/catalogos/catalogo-unidad/catalogo-unidad.component.ts
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import {
  CatalogosService,
  Unidad,
} from '../../../../../core/services/catalogos.service';

@Component({
  selector: 'app-catalogo-unidad',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalogo-unidad.component.html',
  styleUrls: ['./catalogo-unidad.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoUnidadComponent implements OnInit {
  unidades$!: Observable<Unidad[]>;

  form: Partial<Unidad> = {
    nombre: '',
    descripcion: '',
  };

  editing: Unidad | null = null;
  saving = false;
  errorMessage = '';

  searchTerm = '';

  // ===== Modal del sistema =====
  modalOpen = false;
  modalTitle = '';
  modalMessage = '';
  modalOkText = 'Eliminar';
  modalCancelText = 'Cancelar';
  pendingDelete?: Unidad;

  // ✅ Paginación frontend
  page = 1;
  pageSize = 10;

  constructor(private api: CatalogosService) {}

  ngOnInit(): void {
    this.api.loadUnidades();
    this.unidades$ = this.api.unidades$;
  }

  // ====== Normalización ======

  private toUpperValue(value: string | null | undefined): string {
    return String(value || '').toUpperCase();
  }

  onNombreInput(): void {
    this.form.nombre = this.toUpperValue(this.form.nombre);
  }

  onDescripcionInput(): void {
    this.form.descripcion = this.toUpperValue(this.form.descripcion);
  }

  onSearchInput(): void {
    this.searchTerm = this.toUpperValue(this.searchTerm);
    this.resetPage();
  }

  filteredUnidades(unidades: Unidad[]): Unidad[] {
    const term = this.searchTerm.trim().toUpperCase();

    if (!term) return unidades ?? [];

    return (unidades ?? []).filter((unidad) => {
      const nombre = String(unidad.nombre || '').toUpperCase();
      const descripcion = String(unidad.descripcion || '').toUpperCase();

      return nombre.includes(term) || descripcion.includes(term);
    });
  }

  // ====== Modal ======

  openDeleteModal(u: Unidad): void {
    this.pendingDelete = u;
    this.modalTitle = 'Eliminar unidad';
    this.modalMessage = `Esta acción no se puede deshacer. ¿Eliminar "${u.nombre}"?`;
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.pendingDelete = undefined;
  }

  confirmDelete(): void {
    if (!this.pendingDelete) return;

    const u = this.pendingDelete;
    this.closeModal();

    this.api.deleteUnidad(u.id).subscribe({
      next: () => {
        this.errorMessage = '';
        this.api.loadUnidades();
        this.resetPage();
      },
      error: () => {
        this.errorMessage = 'No se pudo eliminar la unidad';
      },
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
    if (!this.form.nombre?.trim()) return;

    this.form = {
      ...this.form,
      nombre: this.toUpperValue(this.form.nombre).trim(),
      descripcion: this.toUpperValue(this.form.descripcion).trim(),
    };

    this.saving = true;
    this.errorMessage = '';

    if (this.editing) {
      this.api.updateUnidad(this.editing.id, this.form).subscribe({
        next: () => {
          this.saving = false;
          this.cancel();
          this.resetPage();
        },
        error: () => {
          this.saving = false;
          this.errorMessage = 'Error actualizando unidad';
        },
      });
    } else {
      this.api.createUnidad(this.form).subscribe({
        next: () => {
          this.saving = false;
          this.form = { nombre: '', descripcion: '' };
          this.resetPage();
        },
        error: () => {
          this.saving = false;
          this.errorMessage = 'Error creando unidad';
        },
      });
    }
  }

  edit(u: Unidad): void {
    this.editing = u;
    this.form = {
      nombre: this.toUpperValue(u.nombre),
      descripcion: this.toUpperValue(u.descripcion),
    };
  }

  cancel(): void {
    this.editing = null;
    this.form = {
      nombre: '',
      descripcion: '',
    };
  }

  remove(u: Unidad): void {
    this.openDeleteModal(u);
  }

  trackById = (_: number, item: Unidad) => item.id;
}
