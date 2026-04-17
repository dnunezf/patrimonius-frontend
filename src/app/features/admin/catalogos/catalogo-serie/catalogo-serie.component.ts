import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  CatalogoSerieService,
  Serie
} from '../../../../../core/services/catalogo-serie.service';

import {
  CatalogosService,
  Unidad
} from '../../../../../core/services/catalogos.service';

@Component({
  selector: 'app-catalogo-serie',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalogo-serie.component.html',
  styleUrls: ['./catalogo-serie.component.css'],
})
export class CatalogoSerieComponent implements OnInit {
  series: Serie[] = [];
  unidades: Unidad[] = [];

  form = {
    codigo: '',
    nombre: '',
    descripcion: '',
    unidad_id: null as number | null,
    plazo_conservacion_anios: null as number | null,
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
    unidad_id: null as number | null,
    plazo_conservacion_anios: null as number | null,
    activa: 1,
  };

  pendingSerie?: Serie;
  pendingDeleteId?: number;

  constructor(
    private api: CatalogoSerieService,
    private catalogosService: CatalogosService
  ) {}

  ngOnInit(): void {
    this.loadUnidades();
    this.load();
  }

  get totalItems(): number {
    return Array.isArray(this.series) ? this.series.length : 0;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pagedSeries(): Serie[] {
    const start = (this.page - 1) * this.pageSize;
    return (this.series ?? []).slice(start, start + this.pageSize);
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

  loadUnidades() {
    this.catalogosService.loadUnidades();

    this.catalogosService.unidades$.subscribe({
      next: (rows: Unidad[]) => {
        this.unidades = Array.isArray(rows) ? rows : [];
      },
      error: (err: unknown) => {
        console.error(err);
      },
    });
  }

  load() {
    this.loading = true;
    this.errorMessage = '';

    this.api.getSeries().subscribe({
      next: (rows: Serie[]) => {
        this.series = Array.isArray(rows) ? rows : [];
        this.loading = false;
        this.ensureNonEmptyPageAfterChange();
      },
      error: (err: unknown) => {
        console.error(err);
        this.errorMessage = 'Error cargando series';
        this.loading = false;
        this.ensureNonEmptyPageAfterChange();
      },
    });
  }

  create() {
    if (
      !this.form.codigo ||
      !this.form.nombre ||
      !this.form.unidad_id ||
      this.form.plazo_conservacion_anios == null ||
      this.form.plazo_conservacion_anios <= 0
    ) {
      alert('Código, nombre, unidad y plazo de conservación en años son obligatorios');
      return;
    }

    this.saving = true;

    this.api.createSerie({
      codigo: this.form.codigo.trim(),
      nombre: this.form.nombre.trim(),
      descripcion: this.form.descripcion?.trim() || null,
      unidad_id: Number(this.form.unidad_id),
      plazo_conservacion_anios: Number(this.form.plazo_conservacion_anios),
      activa: this.form.activa,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.form = {
          codigo: '',
          nombre: '',
          descripcion: '',
          unidad_id: null,
          plazo_conservacion_anios: null,
          activa: 1,
        };
        this.load();
      },
      error: (err: any) => {
        console.error(err);
        this.saving = false;
        alert(err?.error?.message || 'Error creando serie');
      },
    });
  }

  openEditModal(serie: Serie) {
    this.pendingSerie = serie;
    this.pendingDeleteId = undefined;

    this.modalMode = 'edit';
    this.modalTitle = 'Editar serie';
    this.modalMessage = 'Modifica la información de la serie.';
    this.modalOkText = 'Guardar';
    this.modalCancelText = 'Cancelar';

    this.modalForm = {
      codigo: serie.codigo ?? '',
      nombre: serie.nombre ?? '',
      descripcion: serie.descripcion ?? '',
      unidad_id: serie.unidad_id ?? null,
      plazo_conservacion_anios: serie.plazo_conservacion_anios ?? null,
      activa: Number(serie.activa ?? 1),
    };

    this.modalOpen = true;
  }

  openDeleteModal(id: number) {
    this.pendingDeleteId = id;
    this.pendingSerie = undefined;

    this.modalMode = 'confirmDelete';
    this.modalTitle = 'Eliminar serie';
    this.modalMessage = 'Esta acción no se puede deshacer. ¿Deseas continuar?';
    this.modalOkText = 'Eliminar';
    this.modalCancelText = 'Cancelar';

    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.pendingSerie = undefined;
    this.pendingDeleteId = undefined;
  }

  confirmModal() {
    if (this.modalMode === 'edit' && this.pendingSerie) {
      if (
        !this.modalForm.codigo ||
        !this.modalForm.nombre ||
        !this.modalForm.unidad_id ||
        this.modalForm.plazo_conservacion_anios == null ||
        this.modalForm.plazo_conservacion_anios <= 0
      ) {
        alert('Código, nombre, unidad y plazo de conservación en años son obligatorios');
        return;
      }

      this.api.updateSerie(this.pendingSerie.id, {
        codigo: this.modalForm.codigo.trim(),
        nombre: this.modalForm.nombre.trim(),
        descripcion: this.modalForm.descripcion?.trim() || null,
        unidad_id: Number(this.modalForm.unidad_id),
        plazo_conservacion_anios: Number(this.modalForm.plazo_conservacion_anios),
        activa: this.modalForm.activa,
      }).subscribe({
        next: () => {
          this.closeModal();
          this.load();
        },
        error: (err: any) => {
          console.error(err);
          this.closeModal();
          alert(err?.error?.message || 'Error actualizando serie');
        },
      });

      return;
    }

    if (this.modalMode === 'confirmDelete' && this.pendingDeleteId != null) {
      this.api.deleteSerie(this.pendingDeleteId).subscribe({
        next: () => {
          this.closeModal();
          this.load();
        },
        error: (err: any) => {
          console.error(err);
          this.closeModal();
          alert(err?.error?.message || 'No se pudo eliminar la serie');
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
