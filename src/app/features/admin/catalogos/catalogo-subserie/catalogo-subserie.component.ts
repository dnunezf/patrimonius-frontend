import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  CatalogoSubserieService,
  Subserie,
} from '../../../../../core/services/catalogo-subserie.service';

import {
  CatalogoSerieService,
  Serie,
} from '../../../../../core/services/catalogo-serie.service';

@Component({
  selector: 'app-catalogo-subserie',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalogo-subserie.component.html',
  styleUrls: ['./catalogo-subserie.component.css'],
})
export class CatalogoSubserieComponent implements OnInit {
  subseries: Subserie[] = [];
  series: Serie[] = [];

  form = {
    codigo: '',
    nombre: '',
    descripcion: '',
    serie_id: null as number | null,
    activa: 1,
  };

  loading = false;
  saving = false;
  errorMessage = '';

  searchTerm = '';

  page = 1;
  readonly pageSize = 10;
  Math = Math;

  modalOpen = false;
  modalMode: 'edit' | 'confirmDelete' = 'edit';
  modalTitle = '';
  modalMessage = '';
  modalOkText = 'Aceptar';
  modalCancelText = 'Cancelar';

  modalForm = {
    codigo: '',
    nombre: '',
    descripcion: '',
    serie_id: null as number | null,
    activa: 1,
  };

  pendingSubserie?: Subserie;
  pendingDeleteId?: number;

  constructor(
    private api: CatalogoSubserieService,
    private serieApi: CatalogoSerieService,
  ) {}

  ngOnInit(): void {
    this.loadSeries();
    this.load();
  }

  // ===== Normalización =====

  private toUpperValue(value: string | null | undefined): string {
    return String(value || '').toUpperCase();
  }

  onCodigoInput(): void {
    this.form.codigo = this.toUpperValue(this.form.codigo);
  }

  onNombreInput(): void {
    this.form.nombre = this.toUpperValue(this.form.nombre);
  }

  onDescripcionInput(): void {
    this.form.descripcion = this.toUpperValue(this.form.descripcion);
  }

  onModalCodigoInput(): void {
    this.modalForm.codigo = this.toUpperValue(this.modalForm.codigo);
  }

  onModalNombreInput(): void {
    this.modalForm.nombre = this.toUpperValue(this.modalForm.nombre);
  }

  onModalDescripcionInput(): void {
    this.modalForm.descripcion = this.toUpperValue(this.modalForm.descripcion);
  }

  onSearchInput(): void {
    this.searchTerm = this.toUpperValue(this.searchTerm);
    this.goToPage(1);
  }

  // ===== Búsqueda =====

  get filteredSubseries(): Subserie[] {
    const term = this.searchTerm.trim().toUpperCase();

    if (!term) return this.subseries ?? [];

    return (this.subseries ?? []).filter((s) => {
      const codigo = String(s.codigo || '').toUpperCase();
      const nombre = String(s.nombre || '').toUpperCase();
      const descripcion = String(s.descripcion || '').toUpperCase();
      const serie = String(s.serie_nombre || s.serie_id || '').toUpperCase();
      const estado = Number(s.activa ?? 1) === 1 ? 'ACTIVA' : 'INACTIVA';

      return (
        codigo.includes(term) ||
        nombre.includes(term) ||
        descripcion.includes(term) ||
        serie.includes(term) ||
        estado.includes(term)
      );
    });
  }

  // ===== Paginación =====

  get totalItems(): number {
    return Array.isArray(this.filteredSubseries)
      ? this.filteredSubseries.length
      : 0;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pagedSubseries(): Subserie[] {
    const start = (this.page - 1) * this.pageSize;
    return (this.filteredSubseries ?? []).slice(start, start + this.pageSize);
  }

  private clampPage(): void {
    if (!Number.isFinite(this.page) || this.page < 1) this.page = 1;

    const tp = this.totalPages;

    if (this.page > tp) this.page = tp;
  }

  private ensureNonEmptyPageAfterChange(): void {
    this.clampPage();

    const start = (this.page - 1) * this.pageSize;

    if (this.totalItems > 0 && start >= this.totalItems && this.page > 1) {
      this.page--;
    }

    this.clampPage();
  }

  prevPage(): void {
    this.page = Math.max(1, this.page - 1);
  }

  nextPage(): void {
    this.page = Math.min(this.totalPages, this.page + 1);
  }

  goToPage(n: number): void {
    this.page = n;
    this.clampPage();
  }

  // ===== Datos =====

  loadSeries(): void {
    this.serieApi.getSeries().subscribe({
      next: (rows: Serie[]) => {
        this.series = Array.isArray(rows) ? rows : [];
      },
      error: (err: unknown) => {
        console.error(err);
      },
    });
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';

    this.api.getSubseries().subscribe({
      next: (rows: Subserie[]) => {
        this.subseries = Array.isArray(rows) ? rows : [];
        this.loading = false;
        this.ensureNonEmptyPageAfterChange();
      },
      error: (err: unknown) => {
        console.error(err);
        this.errorMessage = 'Error cargando subseries';
        this.loading = false;
        this.ensureNonEmptyPageAfterChange();
      },
    });
  }

  // ===== Crear =====

  create(): void {
    if (!this.form.codigo || !this.form.nombre || !this.form.serie_id) {
      this.errorMessage = 'Código, nombre y serie son obligatorios';
      return;
    }

    const codigo = this.toUpperValue(this.form.codigo).trim();
    const nombre = this.toUpperValue(this.form.nombre).trim();
    const descripcion = this.toUpperValue(this.form.descripcion).trim();

    this.form = {
      ...this.form,
      codigo,
      nombre,
      descripcion,
    };

    this.saving = true;
    this.errorMessage = '';

    this.api
      .createSubserie({
        codigo,
        nombre,
        descripcion: descripcion || null,
        serie_id: Number(this.form.serie_id),
        activa: this.form.activa,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.form = {
            codigo: '',
            nombre: '',
            descripcion: '',
            serie_id: null,
            activa: 1,
          };
          this.load();
        },
        error: (err: any) => {
          console.error(err);
          this.saving = false;
          this.errorMessage = err?.error?.message || 'Error creando subserie';
        },
      });
  }

  // ===== Modal =====

  openEditModal(subserie: Subserie): void {
    this.pendingSubserie = subserie;
    this.pendingDeleteId = undefined;

    this.modalMode = 'edit';
    this.modalTitle = 'Editar subserie';
    this.modalMessage = 'Modifica la información de la subserie.';
    this.modalOkText = 'Guardar';
    this.modalCancelText = 'Cancelar';

    this.modalForm = {
      codigo: this.toUpperValue(subserie.codigo ?? ''),
      nombre: this.toUpperValue(subserie.nombre ?? ''),
      descripcion: this.toUpperValue(subserie.descripcion ?? ''),
      serie_id: subserie.serie_id ?? null,
      activa: Number(subserie.activa ?? 1),
    };

    this.modalOpen = true;
  }

  openDeleteModal(id: number): void {
    this.pendingDeleteId = id;
    this.pendingSubserie = undefined;

    this.modalMode = 'confirmDelete';
    this.modalTitle = 'Eliminar subserie';
    this.modalMessage = 'Esta acción no se puede deshacer. ¿Deseas continuar?';
    this.modalOkText = 'Eliminar';
    this.modalCancelText = 'Cancelar';

    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.pendingSubserie = undefined;
    this.pendingDeleteId = undefined;
  }

  confirmModal(): void {
    if (this.modalMode === 'edit' && this.pendingSubserie) {
      if (
        !this.modalForm.codigo ||
        !this.modalForm.nombre ||
        !this.modalForm.serie_id
      ) {
        this.errorMessage = 'Código, nombre y serie son obligatorios';
        return;
      }

      const codigo = this.toUpperValue(this.modalForm.codigo).trim();
      const nombre = this.toUpperValue(this.modalForm.nombre).trim();
      const descripcion = this.toUpperValue(this.modalForm.descripcion).trim();

      this.api
        .updateSubserie(this.pendingSubserie.id, {
          codigo,
          nombre,
          descripcion: descripcion || null,
          serie_id: Number(this.modalForm.serie_id),
          activa: this.modalForm.activa,
        })
        .subscribe({
          next: () => {
            this.closeModal();
            this.load();
          },
          error: (err: any) => {
            console.error(err);
            this.closeModal();
            this.errorMessage =
              err?.error?.message || 'Error actualizando subserie';
          },
        });

      return;
    }

    if (this.modalMode === 'confirmDelete' && this.pendingDeleteId != null) {
      this.api.deleteSubserie(this.pendingDeleteId).subscribe({
        next: () => {
          this.closeModal();
          this.load();
        },
        error: (err: any) => {
          console.error(err);
          this.closeModal();
          this.errorMessage =
            err?.error?.message || 'No se pudo eliminar la subserie';
        },
      });

      return;
    }

    this.closeModal();
  }

  trackById = (_: number, s: Subserie) => s.id;
}
