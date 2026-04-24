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
import { RevisionDisposicionExpedienteDialogComponent } from './revision-disposicion-expediente-dialog/revision-disposicion-expediente-dialog.component';
import { AprobarDisposicionExpedienteDialogComponent } from './aprobar-disposicion-expediente-dialog/aprobar-disposicion-expediente-dialog.component';
import { RechazarDisposicionExpedienteDialogComponent } from './rechazar-disposicion-expediente-dialog/rechazar-disposicion-expediente-dialog.component';

const DIS_REV_PEND = 'DISPOSICION_REVISION_PENDIENTE';
const DIS_REV_OK = 'DISPOSICION_REVISION_COMPLETADA';

@Component({
  selector: 'app-gestion-plazos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ExpedienteConservacionDetalleDialogComponent,
    DisposicionDocumentalDialogComponent,
    ExtenderVigenciaDialogComponent,
    RevisionDisposicionExpedienteDialogComponent,
    AprobarDisposicionExpedienteDialogComponent,
    RechazarDisposicionExpedienteDialogComponent,
  ],
  templateUrl: './gestion-plazos.component.html',
  styleUrls: ['./gestion-plazos.component.css'],
})
export class GestionPlazosComponent implements OnInit, OnDestroy {
  expedientesCargados: ExpedientePlazoRow[] = [];
  loading = false;
  error = '';

  vistaPlazos: 'archivados' | 'alertas' = 'archivados';

  private textoDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly textoDebounceMs = 400;

  unidades: UnidadOption[] = [];
  series: SerieOption[] = [];
  subseries: SubserieOption[] = [];

  filtroTexto = '';
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

  revisionAbierta = false;
  expedienteRevision: ExpedientePlazoRow | null = null;

  aprobarAbierto = false;
  expedienteAprobar: ExpedientePlazoRow | null = null;

  rechazarAbierto = false;
  expedienteRechazar: ExpedientePlazoRow | null = null;

  readonly pageSize = 10;
  paginaActual = 1;

  constructor(
    private readonly plazosService: GestionPlazosConservacionService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  get seriesVisibles(): SerieOption[] {
    if (this.filtroUnidadId == null) {
      return this.series;
    }
    return this.series.filter((s) => s.unidad_id === this.filtroUnidadId);
  }

  get expedientesListaActiva(): ExpedientePlazoRow[] {
    if (this.vistaPlazos === 'alertas') {
      return this.expedientesListaAlertasVencimiento;
    }
    return this.expedientesCargados;
  }

  get expedientesListaAlertasVencimiento(): ExpedientePlazoRow[] {
    return listaExpedientesAlertasVencimiento(this.expedientesCargados);
  }

  get conteoAlertasVencimiento(): number {
    return this.expedientesListaAlertasVencimiento.length;
  }

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
      this.expedientesListaActiva.length,
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
      },
    });

    this.plazosService.getSeriesCatalogo().subscribe({
      next: (s) => {
        this.series = s;
      },
      error: () => {
        this.series = [];
      },
    });

    this.cargarPlazos();
  }

  ngOnDestroy(): void {
    if (this.textoDebounceTimer != null) {
      clearTimeout(this.textoDebounceTimer);
    }
  }

  aplicarFiltros(): void {
    this.cargarPlazos();
  }

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
        },
      });
    }

    this.aplicarFiltros();
  }

  cargarPlazos(opts?: {
    luegoDeCargar?: (rows: ExpedientePlazoRow[]) => void;
  }): void {
    this.loading = true;
    this.error = '';

    this.plazosService
      .listarPlazos({
        texto: this.filtroTexto || undefined,
        estado: this.filtroEstadoExpediente || undefined,
        unidad_id: this.filtroUnidadId ?? undefined,
        serie_id: this.filtroSerieId ?? undefined,
        subserie_id: this.filtroSubserieId ?? undefined,
      })
      .subscribe({
        next: (data) => {
          this.expedientesCargados = data;
          this.paginaActual = 1;
          this.loading = false;
          opts?.luegoDeCargar?.(data);
        },
        error: (err) => {
          this.error =
            err?.error?.error || 'No se pudieron cargar los expedientes.';
          this.loading = false;
        },
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
    if (!this.puedeDisposicion(ex)) {
      return;
    }
    this.expedienteDisposicion = ex;
    this.disposicionAbierta = true;
  }

  puedeDisposicion(ex: ExpedientePlazoRow): boolean {
    if (ex.estado !== 'CERRADO') {
      return false;
    }

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
    if (ymdV > ymdHoy) {
      return false;
    }

    const st = String(ex.disposicion_estado ?? '').trim();
    if (!st || st === 'DISPOSICION_RECHAZADA') {
      return true;
    }

    return false;
  }

  puedeRevisionDisposicion(ex: ExpedientePlazoRow): boolean {
    const tipo = String(ex.disposicion_tipo ?? '')
      .trim()
      .toUpperCase();
    return (
      ex.estado === 'CERRADO' &&
      String(ex.disposicion_estado ?? '').trim() === DIS_REV_PEND &&
      tipo === 'ELIMINACION'
    );
  }

  puedeAprobarDisposicion(ex: ExpedientePlazoRow): boolean {
    const tipo = String(ex.disposicion_tipo ?? '')
      .trim()
      .toUpperCase();
    return (
      ex.estado === 'CERRADO' &&
      String(ex.disposicion_estado ?? '').trim() === DIS_REV_OK &&
      tipo === 'ELIMINACION'
    );
  }

  puedeRechazarDisposicion(ex: ExpedientePlazoRow): boolean {
    if (ex.estado !== 'CERRADO') {
      return false;
    }

    const st = String(ex.disposicion_estado ?? '').trim();
    if (!st || st === 'DISPOSICION_RECHAZADA') {
      return false;
    }

    if (this.disposicionEstaEjecutada(st)) {
      return false;
    }

    return st === DIS_REV_PEND || st === DIS_REV_OK;
  }

  private disposicionEstaEjecutada(disposicionEstado: string): boolean {
    const s = disposicionEstado.trim().toUpperCase();
    return (
      s === 'DISPOSICION_EJECUTADA_TRANSFERENCIA' ||
      s === 'DISPOSICION_EJECUTADA_ELIMINACION' ||
      s === 'DISPOSICION_EJECUTADA_CONSERVACION_PERMANENTE' ||
      s.startsWith('DISPOSICION_EJECUTADA_')
    );
  }

  abrirRevision(ex: ExpedientePlazoRow): void {
    if (!this.puedeRevisionDisposicion(ex)) {
      return;
    }
    this.expedienteRevision = ex;
    this.revisionAbierta = true;
  }

  cerrarRevision(): void {
    this.revisionAbierta = false;
    this.expedienteRevision = null;
  }

  abrirAprobar(ex: ExpedientePlazoRow): void {
    if (!this.puedeAprobarDisposicion(ex)) {
      return;
    }
    this.expedienteAprobar = ex;
    this.aprobarAbierto = true;
  }

  cerrarAprobar(): void {
    this.aprobarAbierto = false;
    this.expedienteAprobar = null;
  }

  abrirRechazar(ex: ExpedientePlazoRow): void {
    if (!this.puedeRechazarDisposicion(ex)) {
      return;
    }
    this.expedienteRechazar = ex;
    this.rechazarAbierto = true;
  }

  cerrarRechazar(): void {
    this.rechazarAbierto = false;
    this.expedienteRechazar = null;
  }

  private fechaALocalYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  tituloDisposicionDeshabilitada(): string {
    return 'Solo expedientes cerrados, con plazo vencido y sin disposición en curso.';
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

  muestraBotonExtender(ex: ExpedientePlazoRow): boolean {
    return (
      String(ex.estado ?? '')
        .trim()
        .toUpperCase() === 'CERRADO'
    );
  }

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

  onDisposicionIniciada(payload: {
    expedienteId: number;
    tipo: TipoDisposicionId;
    justificacion: string;
    abrirRevisionTrasCargar?: boolean;
  }): void {
    this.cargarPlazos({
      luegoDeCargar: (rows) => {
        if (payload.abrirRevisionTrasCargar === false) {
          return;
        }
        const ex = rows.find((e) => e.id === payload.expedienteId);
        if (ex && this.puedeRevisionDisposicion(ex)) {
          this.abrirRevision(ex);
        }
      },
    });
  }

  onRevisionGuardada(): void {
    this.cargarPlazos();
  }

  onDisposicionAprobada(): void {
    this.cargarPlazos();
  }

  onDisposicionRechazada(): void {
    this.cargarPlazos();
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
