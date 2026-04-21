import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

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
import { ExtenderVigenciaDialogComponent } from './extender-vigencia-dialog/extender-vigencia-dialog.component';
import { listaExpedientesAlertasVencimiento } from './gestion-plazos-alertas-vencimiento';

@Component({
  selector: 'app-gestion-plazos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ExpedienteConservacionDetalleDialogComponent,
    DisposicionDocumentalDialogComponent,
    ExtenderVigenciaDialogComponent,
  ],
  templateUrl: './gestion-plazos.component.html',
  styleUrls: ['./gestion-plazos.component.css']
})
export class GestionPlazosComponent implements OnInit, OnDestroy {
  expedientesCargados: ExpedientePlazoRow[] = [];
  loading = false;
  error = '';

  /** Pestaña superior: listado completo vs solo vencidos (fecha_vencimiento antes que hoy). */
  vistaPlazos: 'archivados' | 'alertas' = 'archivados';

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

  extenderAbierto = false;
  expedienteExtender: ExpedientePlazoRow | null = null;

  /** Paginación del listado (cliente). */
  readonly pageSize = 10;
  paginaActual = 1;

  constructor(
    private readonly plazosService: GestionPlazosConservacionService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  /** Series del catálogo filtradas por unidad organizacional (si hay una elegida). */
  get seriesVisibles(): SerieOption[] {
    if (this.filtroUnidadId == null) {
      return this.series;
    }
    return this.series.filter((s) => s.unidad_id === this.filtroUnidadId);
  }

  /** Listado según pestaña (misma fuente `expedientesCargados`, filtrado en alertas). */
  get expedientesListaActiva(): ExpedientePlazoRow[] {
    if (this.vistaPlazos === 'alertas') {
      return this.expedientesListaAlertasVencimiento;
    }
    return this.expedientesCargados;
  }

  /** Vencimiento estrictamente anterior al día calendario actual (local). */
  get expedientesListaAlertasVencimiento(): ExpedientePlazoRow[] {
    return listaExpedientesAlertasVencimiento(this.expedientesCargados);
  }

  get conteoAlertasVencimiento(): number {
    return this.expedientesListaAlertasVencimiento.length;
  }

  /** Filas visibles en la página actual. */
  get expedientesPagina(): ExpedientePlazoRow[] {
    const lista = this.expedientesListaActiva;
    const start = (this.paginaActual - 1) * this.pageSize;
    return lista.slice(start, start + this.pageSize);
  }

  get totalPaginas(): number {
    const n = this.expedientesListaActiva.length;
    if (n === 0) {
      return 1;
    }
    return Math.ceil(n / this.pageSize);
  }

  get rangoDesde(): number {
    if (this.expedientesListaActiva.length === 0) {
      return 0;
    }
    return (this.paginaActual - 1) * this.pageSize + 1;
  }

  get rangoHasta(): number {
    return Math.min(
      this.paginaActual * this.pageSize,
      this.expedientesListaActiva.length
    );
  }

  seleccionarVista(v: 'archivados' | 'alertas'): void {
    this.vistaPlazos = v;
    this.paginaActual = 1;
  }

  irPagina(p: number): void {
    const max = this.totalPaginas;
    this.paginaActual = Math.min(max, Math.max(1, p));
  }

  volverDashboard(): void {
    this.router.navigate(['/archivista/dashboard']);
  }

  ngOnInit(): void {
    const v = this.route.snapshot.queryParamMap.get('v');
    if (v === 'alertas') {
      this.vistaPlazos = 'alertas';
    }

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
    if (this.vistaPlazos === 'alertas') {
      if (ex.fecha_vencimiento == null || ex.fecha_vencimiento === '') {
        return;
      }
      this.expedienteDisposicion = ex;
      this.disposicionAbierta = true;
      return;
    }
    if (!this.puedeDisposicion(ex)) {
      return;
    }
    this.expedienteDisposicion = ex;
    this.disposicionAbierta = true;
  }

  /**
   * Habilitado solo si la fecha de vencimiento (día local, mismo criterio que la tabla)
   * es estrictamente mayor que la fecha de hoy.
   */
  puedeDisposicion(ex: ExpedientePlazoRow): boolean {
    const raw = ex.fecha_vencimiento;
    if (raw == null || raw === '') {
      return false;
    }
    const v = new Date(raw);
    if (Number.isNaN(v.getTime())) {
      return false;
    }
    const ymdV = this.fechaALocalYmd(v);
    const ymdHoy = this.fechaALocalYmd(new Date());
    return ymdV > ymdHoy;
  }

  private fechaALocalYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  tituloDisposicionDeshabilitada(): string {
    return 'Solo disponible si la fecha de vencimiento es mayor que la de hoy.';
  }

  cerrarDisposicion(): void {
    this.disposicionAbierta = false;
    this.expedienteDisposicion = null;
  }

  abrirExtender(ex: ExpedientePlazoRow): void {
    if (!this.puedeExtenderVigencia(ex)) {
      return;
    }
    this.expedienteExtender = ex;
    this.extenderAbierto = true;
  }

  cerrarExtender(): void {
    this.extenderAbierto = false;
    this.expedienteExtender = null;
  }

  /** Requiere fecha de vencimiento conocida para sumar años. */
  puedeExtenderVigencia(ex: ExpedientePlazoRow): boolean {
    const raw = ex.fecha_vencimiento;
    if (raw == null || raw === '') {
      return false;
    }
    const v = new Date(raw);
    return !Number.isNaN(v.getTime());
  }

  tituloExtenderDeshabilitada(): string {
    return 'Solo disponible si el expediente tiene fecha de vencimiento.';
  }

  onExtensionVigenciaGuardada(): void {
    this.cargarPlazos();
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
