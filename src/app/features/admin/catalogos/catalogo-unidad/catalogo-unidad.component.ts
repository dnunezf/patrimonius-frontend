// src/app/admin/catalogos/catalogo-unidad/catalogo-unidad.component.ts
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { CatalogosService, Unidad } from '../../../../../core/services/catalogos.service';

@Component({
  selector: 'app-catalogo-unidad',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalogo-unidad.component.html',
  styleUrls: ['./catalogo-unidad.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogoUnidadComponent implements OnInit {
  unidades$!: Observable<Unidad[]>;
  form: Partial<Unidad> = { nombre: '', descripcion: '' };
  editing: Unidad | null = null;
  saving = false;
  errorMessage = '';
  // ===== Modal del sistema (reemplaza confirm) =====
  modalOpen = false;
  modalTitle = '';
  modalMessage = '';
  modalOkText = 'Eliminar';
  modalCancelText = 'Cancelar';
  pendingDelete?: Unidad;

  openDeleteModal(u: Unidad) {
    this.pendingDelete = u;
    this.modalTitle = 'Eliminar unidad';
    this.modalMessage = `Esta acción no se puede deshacer. ¿Eliminar "${u.nombre}"?`;
    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.pendingDelete = undefined;
  }

  confirmDelete() {
    if (!this.pendingDelete) return;

    const u = this.pendingDelete;
    this.closeModal();

    this.api.deleteUnidad(u.id).subscribe({
      next: () => {
        this.errorMessage = '';
        // si borraste el último de la página, ajusta paginación
        this.api.loadUnidades();
      },
      error: () => (this.errorMessage = 'No se pudo eliminar la unidad')
    });
  }

  // ✅ Paginación (frontend)
  page = 1;
  pageSize = 10;

  constructor(private api: CatalogosService) {}

  ngOnInit() {
    this.api.loadUnidades();
    this.unidades$ = this.api.unidades$;
  }

  // ====== Paginación helpers ======
  totalPages(totalItems: number): number {
    return Math.max(1, Math.ceil((totalItems || 0) / this.pageSize));
  }

  paged<T>(list: T[]): T[] {
    const start = (this.page - 1) * this.pageSize;
    return (list ?? []).slice(start, start + this.pageSize);
  }

  goPrev(totalItems: number) {
    this.page = Math.max(1, this.page - 1);
  }

  goNext(totalItems: number) {
    const tp = this.totalPages(totalItems);
    this.page = Math.min(tp, this.page + 1);
  }

  ensureValidPage(totalItems: number) {
    const tp = this.totalPages(totalItems);
    if (this.page > tp) this.page = tp;
    if (this.page < 1) this.page = 1;
  }

  resetPage() {
    this.page = 1;
  }

  // ====== CRUD ======
  submit() {
    if (!this.form.nombre?.trim()) return;
    this.saving = true;

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
        }
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
        }
      });
    }
  }

  edit(u: Unidad) {
    this.editing = u;
    this.form = { nombre: u.nombre, descripcion: u.descripcion };
  }

  cancel() {
    this.editing = null;
    this.form = { nombre: '', descripcion: '' };
  }

  remove(u: Unidad) {
    this.openDeleteModal(u);
  }


  trackById = (_: number, item: Unidad) => item.id;
}
