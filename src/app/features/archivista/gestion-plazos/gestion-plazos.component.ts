import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import type {
  SerieOption,
  SubserieOption,
  UnidadOption,
} from '../../../../core/services/document.service';
import {
  ExpedientePlazoRow,
  GestionPlazosConservacionService,
} from '../../../../core/services/gestion-plazos-conservacion.service';
import {
  DisposicionDocumentalDialogComponent,
  TipoDisposicionId,
} from './disposicion-documental-dialog/disposicion-documental-dialog.component';
import { ExpedienteConservacionDetalleDialogComponent } from './expediente-conservacion-detalle/expediente-conservacion-detalle-dialog.component';

@Component({
  selector: 'app-gestion-plazos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ExpedienteConservacionDetalleDialogComponent,
    DisposicionDocumentalDialogComponent,
  ],
  templateUrl: './gestion-plazos.component.html',
  styleUrls: ['./gestion-plazos.component.css']
})
export class GestionPlazosComponent implements OnInit, OnDestroy {
  expedientesCargados: ExpedientePlazoRow[] = [];
  loading = false;
  error = '';

  private textoDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly textoDebounceMs = 400;

  unidades: UnidadOption[] = [];
  series: SerieOption[] = [];
  subseries: SubserieOption[] = [];

  filtroTexto = '';
  /** Refina entre CERRADO, TRANSFERIDO, ELIMINADO (el listado ya solo incluye esos estados). */
  filtroEstadoExpediente = '';
  filtroUnidadId: number | null = null;
  filtroSerieId: number | null = null;
  filtroSubserieId: number | null = null;

  detalleAbierto = false;
  expedienteDetalle: ExpedientePlazoRow | null = null;

  disposicionAbierta = false;
  expedienteDisposicion: ExpedientePlazoRow | null = null;

  /** Paginación del listado (cliente). */
  readonly pageSize = 10;
  paginaActual = 1;

  constructor(
    private readonly plazosService: GestionPlazosConservacionService,
    private readonly router: Router,
  ) {}

  /** Series del catálogo filtradas por unidad organizacional (si hay una elegida). */
  get seriesVisibles(): SerieOption[] {
    if (this.filtroUnidadId == null) {
      return this.series;
    }
    return this.series.filter((s) => s.unidad_id === this.filtroUnidadId);
  }

  /** Filas visibles en la página actual. */
  get expedientesPagina(): ExpedientePlazoRow[] {
    const start = (this.paginaActual - 1) * this.pageSize;
    return this.expedientesCargados.slice(start, start + this.pageSize);
  }

  get totalPaginas(): number {
    const n = this.expedientesCargados.length;
    if (n === 0) {
      return 1;
    }
    return Math.ceil(n / this.pageSize);
  }

  get rangoDesde(): number {
    if (this.expedientesCargados.length === 0) {
      return 0;
    }
    return (this.paginaActual - 1) * this.pageSize + 1;
  }

  get rangoHasta(): number {
    return Math.min(
      this.paginaActual * this.pageSize,
      this.expedientesCargados.length
    );
  }

  irPagina(p: number): void {
    const max = this.totalPaginas;
    this.paginaActual = Math.min(max, Math.max(1, p));
  }

  volverDashboard(): void {
    this.router.navigate(['/archivista/dashboard']);
  }

  ngOnInit(): void {
    this.plazosService.getUnidadesCatalogo().subscribe({
      next: (u) => {
        this.unidades = u;
      },
      error: () => {
        this.unidades = [];
      }
    });
    this.plazosService.getSeriesCatalogo().subscribe({
      next: (s) => {
        this.series = s;
      },
      error: () => {
        this.series = [];
      }
    });
    this.cargarPlazos();
  }

  ngOnDestroy(): void {
    if (this.textoDebounceTimer != null) {
      clearTimeout(this.textoDebounceTimer);
    }
  }

  /** Filtros de lista y desplegables: recarga inmediata. */
  aplicarFiltros(): void {
    this.cargarPlazos();
  }

  /** Campo de texto: recarga con pequeño retraso para no saturar el servidor. */
  onFiltroTextoChange(): void {
    if (this.textoDebounceTimer != null) {
      clearTimeout(this.textoDebounceTimer);
    }
    this.textoDebounceTimer = setTimeout(() => {
      this.textoDebounceTimer = null;
      this.cargarPlazos();
    }, this.textoDebounceMs);
  }

  onUnidadChange(_unidadId: number | null): void {
    this.filtroSerieId = null;
    this.filtroSubserieId = null;
    this.subseries = [];
    this.aplicarFiltros();
  }

  onSerieChange(serieId: number | null): void {
    this.filtroSubserieId = null;
    this.subseries = [];
    if (serieId != null && serieId > 0) {
      this.plazosService.getSubseriesCatalogo(serieId).subscribe({
        next: (ss) => {
          this.subseries = ss;
        },
        error: () => {
          this.subseries = [];
        }
      });
    }
    this.aplicarFiltros();
  }

  cargarPlazos(): void {
    this.loading = true;
    this.error = '';

    this.plazosService.listarPlazos({
      texto: this.filtroTexto || undefined,
      estado: this.filtroEstadoExpediente || undefined,
      unidad_id: this.filtroUnidadId ?? undefined,
      serie_id: this.filtroSerieId ?? undefined,
      subserie_id: this.filtroSubserieId ?? undefined,
    }).subscribe({
      next: (data) => {
        this.expedientesCargados = data;
        this.paginaActual = 1;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.error || 'No se pudieron cargar los expedientes.';
        this.loading = false;
      }
    });
  }

  limpiarFiltros(): void {
    if (this.textoDebounceTimer != null) {
      clearTimeout(this.textoDebounceTimer);
      this.textoDebounceTimer = null;
    }
    this.filtroTexto = '';
    this.filtroEstadoExpediente = '';
    this.filtroUnidadId = null;
    this.filtroSerieId = null;
    this.filtroSubserieId = null;
    this.subseries = [];
    this.cargarPlazos();
  }

  abrirDetalle(ex: ExpedientePlazoRow): void {
    this.expedienteDetalle = ex;
    this.detalleAbierto = true;
  }

  cerrarDetalle(): void {
    this.detalleAbierto = false;
    this.expedienteDetalle = null;
  }

  abrirDisposicion(ex: ExpedientePlazoRow): void {
    this.expedienteDisposicion = ex;
    this.disposicionAbierta = true;
  }

  cerrarDisposicion(): void {
    this.disposicionAbierta = false;
    this.expedienteDisposicion = null;
  }

  /** Reservado: enlazar POST de disposición / bitácora cuando exista el endpoint. */
  onDisposicionIniciada(_payload: {
    expedienteId: number;
    tipo: TipoDisposicionId;
    justificacion: string;
  }): void {
    /* Intencionalmente vacío: el combo y la justificación quedan listos para el API. */
  }

  getEstadoExpedienteClass(estado: string | null): string {
    switch (estado) {
      case 'CERRADO':
        return 'badge exp-cerrado';
      case 'TRANSFERIDO':
        return 'badge exp-transferido';
      case 'ELIMINADO':
        return 'badge exp-eliminado';
      default:
        return 'badge';
    }
  }
}
