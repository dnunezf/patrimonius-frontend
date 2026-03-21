import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  ExpedienteService,
  Expediente
} from '../../../../../core/services/expediente.service';

import {
  CatalogosService,
  Unidad
} from '../../../../../core/services/catalogos.service';

import {
  CatalogoSerieService,
  Serie
} from '../../../../../core/services/catalogo-serie.service';

import {
  CatalogoSubserieService,
  Subserie
} from '../../../../../core/services/catalogo-subserie.service';

@Component({
  selector: 'app-catalogo-expediente',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalogo-expediente.component.html',
  styleUrls: ['./catalogo-expediente.component.css'],
})
export class CatalogoExpedienteComponent implements OnInit {
  expedientes: Expediente[] = [];
  unidades: Unidad[] = [];
  series: Serie[] = [];
  subseries: Subserie[] = [];

  form = {
    codigo: '',
    nombre: '',
    descripcion: '',
    unidad_id: null as number | null,
    serie_id: null as number | null,
    subserie_id: null as number | null,
    estado: 'ACTIVO' as 'ACTIVO' | 'CERRADO' | 'TRANSFERIDO' | 'ELIMINADO',
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
    serie_id: null as number | null,
    subserie_id: null as number | null,
    estado: 'ACTIVO' as 'ACTIVO' | 'CERRADO' | 'TRANSFERIDO' | 'ELIMINADO',
    fecha_cierre: '' as string | null,
  };

  modalSeries: Serie[] = [];
  modalSubseries: Subserie[] = [];

  pendingExpediente?: Expediente;
  pendingDeleteId?: number;

  constructor(
    private api: ExpedienteService,
    private catalogosService: CatalogosService,
    private serieApi: CatalogoSerieService,
    private subserieApi: CatalogoSubserieService
  ) {}

  ngOnInit(): void {
    this.loadUnidades();
    this.load();
  }

  get totalItems(): number {
    return Array.isArray(this.expedientes) ? this.expedientes.length : 0;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pagedExpedientes(): Expediente[] {
    const start = (this.page - 1) * this.pageSize;
    return (this.expedientes ?? []).slice(start, start + this.pageSize);
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

  loadSeriesByUnidad(unidadId: number | null) {
    if (!unidadId) {
      this.series = [];
      this.subseries = [];
      this.form.serie_id = null;
      this.form.subserie_id = null;
      return;
    }

    this.serieApi.getSeries(unidadId).subscribe({
      next: (rows: Serie[]) => {
        this.series = Array.isArray(rows) ? rows : [];
        this.subseries = [];
        this.form.serie_id = null;
        this.form.subserie_id = null;
      },
      error: (err: unknown) => {
        console.error(err);
      },
    });
  }

  loadSubseriesBySerie(serieId: number | null) {
    if (!serieId) {
      this.subseries = [];
      this.form.subserie_id = null;
      return;
    }

    this.subserieApi.getSubseries(serieId).subscribe({
      next: (rows: Subserie[]) => {
        this.subseries = Array.isArray(rows) ? rows : [];
        this.form.subserie_id = null;
      },
      error: (err: unknown) => {
        console.error(err);
      },
    });
  }

  onUnidadChange() {
    this.loadSeriesByUnidad(this.form.unidad_id);
  }

  onSerieChange() {
    this.loadSubseriesBySerie(this.form.serie_id);
  }

  load() {
    this.loading = true;
    this.errorMessage = '';

    this.api.getExpedientes().subscribe({
      next: (rows: Expediente[]) => {
        this.expedientes = Array.isArray(rows) ? rows : [];
        this.loading = false;
        this.ensureNonEmptyPageAfterChange();
      },
      error: (err: unknown) => {
        console.error(err);
        this.errorMessage = 'Error cargando expedientes';
        this.loading = false;
        this.ensureNonEmptyPageAfterChange();
      },
    });
  }

  create() {
    if (!this.form.codigo || !this.form.nombre || !this.form.unidad_id || !this.form.serie_id) {
      alert('Código, nombre, unidad y serie son obligatorios');
      return;
    }

    this.saving = true;

    this.api.createExpediente({
      codigo: this.form.codigo.trim(),
      nombre: this.form.nombre.trim(),
      descripcion: this.form.descripcion?.trim() || null,
      unidad_id: Number(this.form.unidad_id),
      serie_id: Number(this.form.serie_id),
      subserie_id: this.form.subserie_id ? Number(this.form.subserie_id) : null,
      estado: this.form.estado,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.form = {
          codigo: '',
          nombre: '',
          descripcion: '',
          unidad_id: null,
          serie_id: null,
          subserie_id: null,
          estado: 'ACTIVO',
        };
        this.series = [];
        this.subseries = [];
        this.load();
      },
      error: (err: any) => {
        console.error(err);
        this.saving = false;
        alert(err?.error?.message || 'Error creando expediente');
      },
    });
  }

  openEditModal(item: Expediente) {
    this.pendingExpediente = item;
    this.pendingDeleteId = undefined;

    this.modalMode = 'edit';
    this.modalTitle = 'Editar expediente';
    this.modalMessage = 'Modifica la información del expediente.';
    this.modalOkText = 'Guardar';
    this.modalCancelText = 'Cancelar';

    this.modalForm = {
      codigo: item.codigo ?? '',
      nombre: item.nombre ?? '',
      descripcion: item.descripcion ?? '',
      unidad_id: item.unidad_id ?? null,
      serie_id: item.serie_id ?? null,
      subserie_id: item.subserie_id ?? null,
      estado: item.estado ?? 'ACTIVO',
      fecha_cierre: item.fecha_cierre ?? '',
    };

    this.modalOpen = true;

    if (item.unidad_id) {
      this.serieApi.getSeries(item.unidad_id).subscribe({
        next: (rows: Serie[]) => {
          this.modalSeries = Array.isArray(rows) ? rows : [];

          if (item.serie_id) {
            this.subserieApi.getSubseries(item.serie_id).subscribe({
              next: (subRows: Subserie[]) => {
                this.modalSubseries = Array.isArray(subRows) ? subRows : [];
              },
              error: (err: unknown) => {
                console.error(err);
              },
            });
          }
        },
        error: (err: unknown) => {
          console.error(err);
        },
      });
    }
  }

  onModalUnidadChange() {
    if (!this.modalForm.unidad_id) {
      this.modalSeries = [];
      this.modalSubseries = [];
      this.modalForm.serie_id = null;
      this.modalForm.subserie_id = null;
      return;
    }

    this.serieApi.getSeries(this.modalForm.unidad_id).subscribe({
      next: (rows: Serie[]) => {
        this.modalSeries = Array.isArray(rows) ? rows : [];
        this.modalSubseries = [];
        this.modalForm.serie_id = null;
        this.modalForm.subserie_id = null;
      },
      error: (err: unknown) => {
        console.error(err);
      },
    });
  }

  onModalSerieChange() {
    if (!this.modalForm.serie_id) {
      this.modalSubseries = [];
      this.modalForm.subserie_id = null;
      return;
    }

    this.subserieApi.getSubseries(this.modalForm.serie_id).subscribe({
      next: (rows: Subserie[]) => {
        this.modalSubseries = Array.isArray(rows) ? rows : [];
        this.modalForm.subserie_id = null;
      },
      error: (err: unknown) => {
        console.error(err);
      },
    });
  }

  openDeleteModal(id: number) {
    this.pendingDeleteId = id;
    this.pendingExpediente = undefined;

    this.modalMode = 'confirmDelete';
    this.modalTitle = 'Eliminar expediente';
    this.modalMessage = 'Esta acción no se puede deshacer. ¿Deseas continuar?';
    this.modalOkText = 'Eliminar';
    this.modalCancelText = 'Cancelar';

    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.pendingExpediente = undefined;
    this.pendingDeleteId = undefined;
    this.modalSeries = [];
    this.modalSubseries = [];
  }

  confirmModal() {
    if (this.modalMode === 'edit' && this.pendingExpediente) {
      if (!this.modalForm.codigo || !this.modalForm.nombre || !this.modalForm.unidad_id || !this.modalForm.serie_id) {
        alert('Código, nombre, unidad y serie son obligatorios');
        return;
      }

      this.api.updateExpediente(this.pendingExpediente.id, {
        codigo: this.modalForm.codigo.trim(),
        nombre: this.modalForm.nombre.trim(),
        descripcion: this.modalForm.descripcion?.trim() || null,
        unidad_id: Number(this.modalForm.unidad_id),
        serie_id: Number(this.modalForm.serie_id),
        subserie_id: this.modalForm.subserie_id ? Number(this.modalForm.subserie_id) : null,
        estado: this.modalForm.estado,
        fecha_cierre: this.modalForm.fecha_cierre || null,
      }).subscribe({
        next: () => {
          this.closeModal();
          this.load();
        },
        error: (err: any) => {
          console.error(err);
          this.closeModal();
          alert(err?.error?.message || 'Error actualizando expediente');
        },
      });

      return;
    }

    if (this.modalMode === 'confirmDelete' && this.pendingDeleteId != null) {
      this.api.deleteExpediente(this.pendingDeleteId).subscribe({
        next: () => {
          this.closeModal();
          this.load();
        },
        error: (err: any) => {
          console.error(err);
          this.closeModal();
          alert(err?.error?.message || 'No se pudo eliminar el expediente');
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
