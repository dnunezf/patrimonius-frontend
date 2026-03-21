import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  CatalogoSubserieService,
  Subserie
} from '../../../../../core/services/catalogo-subserie.service';

import {
  CatalogoSerieService,
  Serie
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
    private serieApi: CatalogoSerieService
  ) {}

  ngOnInit(): void {
    this.loadSeries();
    this.load();
  }

  get totalItems(): number {
    return Array.isArray(this.subseries) ? this.subseries.length : 0;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pagedSubseries(): Subserie[] {
    const start = (this.page - 1) * this.pageSize;
    return (this.subseries ?? []).slice(start, start + this.pageSize);
  }

  private clampPage() {
    if (!Number.isFinite(this.page) || this.page < 1) this.page = 1;
    const tp = this.totalPages;
    if (this.page > tp) this.page = tp;
  }

  private ensureNonEmptyPageAfterChange() {
    this.clampPage();
    const start = (this.page - 1) * this.pageSize;
    if (this.totalItems > 0 && start >= this.totalItems && this.page > 1) {
      this.page--;
    }
    this.clampPage();
  }

  loadSeries() {
    this.serieApi.getSeries().subscribe({
      next: (rows: Serie[]) => {
        this.series = Array.isArray(rows) ? rows : [];
      },
      error: (err: unknown) => {
        console.error(err);
      },
    });
  }

  load() {
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

  create() {
    if (!this.form.codigo || !this.form.nombre || !this.form.serie_id) {
      alert('Código, nombre y serie son obligatorios');
      return;
    }

    this.saving = true;

    this.api.createSubserie({
      codigo: this.form.codigo.trim(),
      nombre: this.form.nombre.trim(),
      descripcion: this.form.descripcion?.trim() || null,
      serie_id: Number(this.form.serie_id),
      activa: this.form.activa,
    }).subscribe({
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
        alert(err?.error?.message || 'Error creando subserie');
      },
    });
  }

  openEditModal(subserie: Subserie) {
    this.pendingSubserie = subserie;
    this.pendingDeleteId = undefined;

    this.modalMode = 'edit';
    this.modalTitle = 'Editar subserie';
    this.modalMessage = 'Modifica la información de la subserie.';
    this.modalOkText = 'Guardar';
    this.modalCancelText = 'Cancelar';

    this.modalForm = {
      codigo: subserie.codigo ?? '',
      nombre: subserie.nombre ?? '',
      descripcion: subserie.descripcion ?? '',
      serie_id: subserie.serie_id ?? null,
      activa: Number(subserie.activa ?? 1),
    };

    this.modalOpen = true;
  }

  openDeleteModal(id: number) {
    this.pendingDeleteId = id;
    this.pendingSubserie = undefined;

    this.modalMode = 'confirmDelete';
    this.modalTitle = 'Eliminar subserie';
    this.modalMessage = 'Esta acción no se puede deshacer. ¿Deseas continuar?';
    this.modalOkText = 'Eliminar';
    this.modalCancelText = 'Cancelar';

    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.pendingSubserie = undefined;
    this.pendingDeleteId = undefined;
  }

  confirmModal() {
    if (this.modalMode === 'edit' && this.pendingSubserie) {
      if (!this.modalForm.codigo || !this.modalForm.nombre || !this.modalForm.serie_id) {
        alert('Código, nombre y serie son obligatorios');
        return;
      }

      this.api.updateSubserie(this.pendingSubserie.id, {
        codigo: this.modalForm.codigo.trim(),
        nombre: this.modalForm.nombre.trim(),
        descripcion: this.modalForm.descripcion?.trim() || null,
        serie_id: Number(this.modalForm.serie_id),
        activa: this.modalForm.activa,
      }).subscribe({
        next: () => {
          this.closeModal();
          this.load();
        },
        error: (err: any) => {
          console.error(err);
          this.closeModal();
          alert(err?.error?.message || 'Error actualizando subserie');
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
          alert(err?.error?.message || 'No se pudo eliminar la subserie');
        },
      });

      return;
    }

    this.closeModal();
  }

  prevPage() {
    this.page = Math.max(1, this.page - 1);
  }

  nextPage() {
    this.page = Math.min(this.totalPages, this.page + 1);
  }

  goToPage(n: number) {
    this.page = n;
    this.clampPage();
  }
}
