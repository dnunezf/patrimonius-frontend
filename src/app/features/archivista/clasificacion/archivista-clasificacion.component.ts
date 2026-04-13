import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ExpedienteDocumentosDialogComponent } from './expediente-documentos-dialog.component';

interface SerieRow {
  id: number;
  codigo: string;
  nombre: string;
  unidad_nombre?: string;
}

interface SubserieRow {
  id: number;
  codigo: string;
  nombre: string;
  serie_nombre?: string;
}

interface ExpedienteRow {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  estado: 'ACTIVO' | 'CERRADO' | 'TRANSFERIDO' | 'ELIMINADO';
  fecha_creacion?: string | null;
  fecha_cierre?: string | null;

  unidad_id: number;
  serie_id: number;
  subserie_id?: number | null;
  created_by?: number | null;
  updated_at?: string | null;

  unidad_nombre?: string;
  serie_nombre?: string;
  subserie_nombre?: string | null;
}

interface ExpedienteDocumentoRow {
  id: number;
  titulo: string;
  estado: string;
  numero_serie?: string | null;
  expediente_id?: number | null;
}

@Component({
  selector: 'app-archivista-clasificacion',
  templateUrl: './archivista-clasificacion.component.html',
  styleUrls: ['./archivista-clasificacion.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule, ExpedienteDocumentosDialogComponent],
})
export class ArchivistaClasificacionComponent implements OnInit, OnDestroy {
  private readonly apiUrl = 'http://localhost:3000';

  series: SerieRow[] = [];
  subseries: SubserieRow[] = [];
  expedientes: ExpedienteRow[] = [];

  filteredSeries: SerieRow[] = [];
  filteredSubseries: SubserieRow[] = [];
  filteredExpedientes: ExpedienteRow[] = [];

  filtroSerieCodigo = '';
  filtroSerieNombre = '';
  filtroSerieUnidad = '';

  filtroSubserieCodigo = '';
  filtroSubserieNombre = '';
  filtroSubserieSerie = '';

  filtroExpedienteCodigo = '';
  filtroExpedienteNombre = '';
  filtroExpedienteUnidad = '';
  filtroExpedienteSerie = '';
  filtroExpedienteSubserie = '';
  filtroExpedienteEstado = '';

  loadingSeries = false;
  loadingSubseries = false;
  loadingExpedientes = false;

  errorSeries = '';
  errorSubseries = '';
  errorExpedientes = '';

  expedienteDocsOpen = false;
  expedienteDocsLoading = false;
  expedienteDocsError = '';
  expedienteDocsTitle = '';
  expedienteDocsRows: ExpedienteDocumentoRow[] = [];

  seriesPage = 1;
  seriesPageSize = 5;
  pagedSeries: SerieRow[] = [];

  subseriesPage = 1;
  subseriesPageSize = 5;
  pagedSubseries: SubserieRow[] = [];

  expedientesPage = 1;
  expedientesPageSize = 5;
  pagedExpedientes: ExpedienteRow[] = [];

  /** Diálogo de confirmación (sustituye window.confirm) */
  confirmDialogOpen = false;
  confirmDialogTitle = '';
  confirmDialogMessage = '';
  private pendingConfirmAction: (() => void) | null = null;

  /** Toast in-app (sustituye alert) */
  toastVisible = false;
  toastMessage = '';
  toastKind: 'success' | 'error' = 'success';
  private toastClearId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnDestroy(): void {
    if (this.toastClearId) {
      clearTimeout(this.toastClearId);
      this.toastClearId = null;
    }
  }

  ngOnInit(): void {
    this.cargarSeries();
    this.cargarSubseries();
    this.cargarExpedientes();
  }

  cargarSeries(): void {
    this.loadingSeries = true;
    this.errorSeries = '';

    this.http.get<SerieRow[]>(`${this.apiUrl}/api/series`).subscribe({
      next: (response) => {
        this.series = response ?? [];
        this.aplicarFiltroSeries();
        this.loadingSeries = false;
      },
      error: (error) => {
        this.errorSeries = 'No se pudieron cargar las series.';
        this.loadingSeries = false;
        console.error('Error al obtener las series:', error);
      },
    });
  }

  cargarSubseries(): void {
    this.loadingSubseries = true;
    this.errorSubseries = '';

    this.http.get<SubserieRow[]>(`${this.apiUrl}/subseries`).subscribe({
      next: (response) => {
        this.subseries = response ?? [];
        this.aplicarFiltroSubseries();
        this.loadingSubseries = false;
      },
      error: (error) => {
        this.errorSubseries = 'No se pudieron cargar las subseries.';
        this.loadingSubseries = false;
        console.error('Error al obtener las subseries:', error);
      },
    });
  }

  cargarExpedientes(): void {
    this.loadingExpedientes = true;
    this.errorExpedientes = '';

    this.http.get<ExpedienteRow[]>(`${this.apiUrl}/api/admin/expedientes`).subscribe({
      next: (response) => {
        this.expedientes = response ?? [];
        this.aplicarFiltroExpedientes();
        this.loadingExpedientes = false;
      },
      error: (error) => {
        this.errorExpedientes = 'No se pudieron cargar los expedientes.';
        this.loadingExpedientes = false;
        console.error('Error al obtener los expedientes:', error);
      },
    });
  }

  aplicarFiltroSeries(): void {
    const codigoQ = this.filtroSerieCodigo.trim().toLowerCase();
    const nombreQ = this.filtroSerieNombre.trim().toLowerCase();
    const unidadQ = this.filtroSerieUnidad.trim().toLowerCase();

    this.filteredSeries = this.series.filter((s) => {
      const matchCodigo =
        !codigoQ || String(s.codigo || '').toLowerCase().includes(codigoQ);

      const matchNombre =
        !nombreQ || String(s.nombre || '').toLowerCase().includes(nombreQ);

      const matchUnidad =
        !unidadQ || String(s.unidad_nombre || '').toLowerCase().includes(unidadQ);

      return matchCodigo && matchNombre && matchUnidad;
    });
    this.seriesPage = 1;
    this.repaginarSeries();
  }

  aplicarFiltroSubseries(): void {
    const codigoQ = this.filtroSubserieCodigo.trim().toLowerCase();
    const nombreQ = this.filtroSubserieNombre.trim().toLowerCase();
    const serieQ = this.filtroSubserieSerie.trim().toLowerCase();

    this.filteredSubseries = this.subseries.filter((s) => {
      const matchCodigo =
        !codigoQ || String(s.codigo || '').toLowerCase().includes(codigoQ);

      const matchNombre =
        !nombreQ || String(s.nombre || '').toLowerCase().includes(nombreQ);

      const matchSerie =
        !serieQ || String(s.serie_nombre || '').toLowerCase().includes(serieQ);

      return matchCodigo && matchNombre && matchSerie;
    });
    this.subseriesPage = 1;
    this.repaginarSubseries();
  }

  aplicarFiltroExpedientes(): void {
    const codigoQ = this.filtroExpedienteCodigo.trim().toLowerCase();
    const nombreQ = this.filtroExpedienteNombre.trim().toLowerCase();
    const unidadQ = this.filtroExpedienteUnidad.trim().toLowerCase();
    const serieQ = this.filtroExpedienteSerie.trim().toLowerCase();
    const subserieQ = this.filtroExpedienteSubserie.trim().toLowerCase();
    const estadoQ = this.filtroExpedienteEstado.trim().toLowerCase();

    this.filteredExpedientes = this.expedientes.filter((e) => {
      const matchCodigo =
        !codigoQ || String(e.codigo || '').toLowerCase().includes(codigoQ);

      const matchNombre =
        !nombreQ || String(e.nombre || '').toLowerCase().includes(nombreQ);

      const matchUnidad =
        !unidadQ || String(e.unidad_nombre || '').toLowerCase().includes(unidadQ);

      const matchSerie =
        !serieQ || String(e.serie_nombre || '').toLowerCase().includes(serieQ);

      const matchSubserie =
        !subserieQ || String(e.subserie_nombre || '').toLowerCase().includes(subserieQ);

      const matchEstado =
        !estadoQ || String(e.estado || '').toLowerCase().includes(estadoQ);

      return (
        matchCodigo &&
        matchNombre &&
        matchUnidad &&
        matchSerie &&
        matchSubserie &&
        matchEstado
      );
    });
    this.expedientesPage = 1;
    this.repaginarExpedientes();
  }

  limpiarFiltrosSeries(): void {
    this.filtroSerieCodigo = '';
    this.filtroSerieNombre = '';
    this.filtroSerieUnidad = '';
    this.aplicarFiltroSeries();
  }

  limpiarFiltrosSubseries(): void {
    this.filtroSubserieCodigo = '';
    this.filtroSubserieNombre = '';
    this.filtroSubserieSerie = '';
    this.aplicarFiltroSubseries();
  }

  limpiarFiltrosExpedientes(): void {
    this.filtroExpedienteCodigo = '';
    this.filtroExpedienteNombre = '';
    this.filtroExpedienteUnidad = '';
    this.filtroExpedienteSerie = '';
    this.filtroExpedienteSubserie = '';
    this.filtroExpedienteEstado = '';
    this.aplicarFiltroExpedientes();
  }

  crearSerie(): void {
    this.router.navigate(['/archivista/crear-serie']);
  }

  crearSubserie(): void {
    this.router.navigate(['/archivista/crear-subserie']);
  }
  verIndices(): void {
    this.router.navigate(['/archivista/indices']);
  }

  verSerie(serieId: number): void {
    this.router.navigate([`/archivista/serie/${serieId}`]);
  }

  verSubserie(subserieId: number): void {
    this.router.navigate([`/archivista/subserie/${subserieId}`]);
  }

  private openConfirm(title: string, message: string, onConfirm: () => void): void {
    this.confirmDialogTitle = title;
    this.confirmDialogMessage = message;
    this.pendingConfirmAction = onConfirm;
    this.confirmDialogOpen = true;
  }

  confirmDialogAccept(): void {
    const fn = this.pendingConfirmAction;
    this.closeConfirmDialog();
    fn?.();
  }

  confirmDialogCancel(): void {
    this.closeConfirmDialog();
  }

  private closeConfirmDialog(): void {
    this.confirmDialogOpen = false;
    this.pendingConfirmAction = null;
  }

  private showToast(message: string, kind: 'success' | 'error'): void {
    if (this.toastClearId) {
      clearTimeout(this.toastClearId);
      this.toastClearId = null;
    }
    this.toastMessage = message;
    this.toastKind = kind;
    this.toastVisible = true;
    this.toastClearId = setTimeout(() => {
      this.toastVisible = false;
      this.toastClearId = null;
    }, 4200);
  }

  eliminarSerie(id: number, nombre: string): void {
    this.openConfirm(
      'Eliminar serie',
      `¿Seguro que quieres eliminar la serie "${nombre}"?`,
      () => {
        this.http.delete(`${this.apiUrl}/api/series/${id}`).subscribe({
          next: () => {
            this.series = this.series.filter((s) => s.id !== id);
            this.aplicarFiltroSeries();
            this.showToast('Serie eliminada correctamente', 'success');
          },
          error: (error) => {
            const mensaje =
              error?.error?.error ||
              error?.error?.message ||
              'No se pudo eliminar la serie';
            this.showToast(mensaje, 'error');
            console.error('Error al eliminar serie:', error);
          },
        });
      },
    );
  }

  eliminarSubserie(id: number, nombre: string): void {
    this.openConfirm(
      'Eliminar subserie',
      `¿Seguro que quieres eliminar la subserie "${nombre}"?`,
      () => {
        this.http.delete(`${this.apiUrl}/subseries/${id}`).subscribe({
          next: () => {
            this.subseries = this.subseries.filter((s) => s.id !== id);
            this.aplicarFiltroSubseries();
            this.showToast('Subserie eliminada correctamente', 'success');
          },
          error: (error) => {
            const mensaje =
              error?.error?.error ||
              error?.error?.message ||
              'No se pudo eliminar la subserie';
            this.showToast(mensaje, 'error');
            console.error('Error al eliminar subserie:', error);
          },
        });
      },
    );
  }

  cerrarExpediente(expediente: ExpedienteRow): void {
    if (expediente.estado !== 'ACTIVO') return;

    this.openConfirm(
      'Cerrar expediente',
      `¿Deseas cerrar el expediente "${expediente.nombre}" y generar su índice electrónico?`,
      () => {
        this.http
          .post(`${this.apiUrl}/indices/cerrar-expediente/${expediente.id}`, {})
          .subscribe({
            next: () => {
              this.showToast(
                'Expediente cerrado e índice electrónico generado correctamente.',
                'success',
              );
              this.cargarExpedientes();
            },
            error: (error) => {
              const mensaje =
                error?.error?.message ||
                'No se pudo cerrar el expediente ni generar el índice.';
              this.showToast(mensaje, 'error');
              console.error('Error al cerrar expediente:', error);
            },
          });
      },
    );
  }

  abrirExpediente(expediente: ExpedienteRow): void {
    if (expediente.estado !== 'CERRADO') return;

    this.openConfirm(
      'Reabrir expediente',
      `¿Deseas reabrir el expediente "${expediente.nombre}"?`,
      () => {
        this.http
          .put(`${this.apiUrl}/api/admin/expedientes/${expediente.id}`, {
            codigo: expediente.codigo,
            nombre: expediente.nombre,
            descripcion: expediente.descripcion ?? null,
            unidad_id: expediente.unidad_id,
            serie_id: expediente.serie_id,
            subserie_id: expediente.subserie_id ?? null,
            estado: 'ACTIVO',
            fecha_cierre: null,
          })
          .subscribe({
            next: () => {
              this.showToast('Expediente reabierto correctamente.', 'success');
              this.cargarExpedientes();
            },
            error: (error) => {
              const mensaje =
                error?.error?.message || 'No se pudo reabrir el expediente.';
              this.showToast(mensaje, 'error');
              console.error('Error al abrir expediente:', error);
            },
          });
      },
    );
  }

  estadoClass(estado: string | null | undefined): string {
    const e = String(estado || '').toUpperCase();
    if (e === 'ACTIVO') return 'pill ok';
    if (e === 'CERRADO') return 'pill warn';
    if (e === 'TRANSFERIDO') return 'pill info';
    if (e === 'ELIMINADO') return 'pill danger';
    return 'pill';
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);

    return d.toLocaleDateString('es-CR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
  verDocumentosExpediente(expediente: ExpedienteRow): void {
    this.expedienteDocsOpen = true;
    this.expedienteDocsLoading = true;
    this.expedienteDocsError = '';
    this.expedienteDocsRows = [];
    this.expedienteDocsTitle = expediente.nombre;

    this.http
      .get<ExpedienteDocumentoRow[]>(
        `${this.apiUrl}/documentos/expediente/${expediente.id}`
      )
      .subscribe({
        next: (response) => {
          this.expedienteDocsRows = response ?? [];
          this.expedienteDocsLoading = false;
        },
        error: (error) => {
          this.expedienteDocsLoading = false;
          this.expedienteDocsError =
            error?.error?.message ||
            'No se pudieron cargar los documentos del expediente.';
          console.error('Error al cargar documentos del expediente:', error);
        },
      });
  }
  cerrarDocumentosExpediente(): void {
    this.expedienteDocsOpen = false;
    this.expedienteDocsLoading = false;
    this.expedienteDocsError = '';
    this.expedienteDocsRows = [];
    this.expedienteDocsTitle = '';
  }
  documentoEstadoClass(estado: string | null | undefined): string {
    const e = String(estado || '').toUpperCase();

    if (e === 'CREACION') return 'pill';
    if (e === 'EDICION') return 'pill info';
    if (e === 'FIRMA' || e === 'FIRMA_PARCIAL') return 'pill warn';
    if (e === 'APROBADO') return 'pill ok';
    if (e === 'ARCHIVADO') return 'pill ok';
    if (e === 'ELIMINACION' || e === 'TRANSFERENCIA') return 'pill danger';

    return 'pill';
  }

  get totalSeriesPages(): number {
    return Math.max(1, Math.ceil(this.filteredSeries.length / this.seriesPageSize));
  }

  get totalSubseriesPages(): number {
    return Math.max(1, Math.ceil(this.filteredSubseries.length / this.subseriesPageSize));
  }

  get totalExpedientesPages(): number {
    return Math.max(1, Math.ceil(this.filteredExpedientes.length / this.expedientesPageSize));
  }

  get seriesRangeStart(): number {
    if (this.filteredSeries.length === 0) return 0;
    return (this.seriesPage - 1) * this.seriesPageSize + 1;
  }

  get seriesRangeEnd(): number {
    return Math.min(this.seriesPage * this.seriesPageSize, this.filteredSeries.length);
  }

  get subseriesRangeStart(): number {
    if (this.filteredSubseries.length === 0) return 0;
    return (this.subseriesPage - 1) * this.subseriesPageSize + 1;
  }

  get subseriesRangeEnd(): number {
    return Math.min(this.subseriesPage * this.subseriesPageSize, this.filteredSubseries.length);
  }

  get expedientesRangeStart(): number {
    if (this.filteredExpedientes.length === 0) return 0;
    return (this.expedientesPage - 1) * this.expedientesPageSize + 1;
  }

  get expedientesRangeEnd(): number {
    return Math.min(this.expedientesPage * this.expedientesPageSize, this.filteredExpedientes.length);
  }

  private repaginarSeries(): void {
    const start = (this.seriesPage - 1) * this.seriesPageSize;
    this.pagedSeries = this.filteredSeries.slice(start, start + this.seriesPageSize);
  }

  private repaginarSubseries(): void {
    const start = (this.subseriesPage - 1) * this.subseriesPageSize;
    this.pagedSubseries = this.filteredSubseries.slice(start, start + this.subseriesPageSize);
  }

  private repaginarExpedientes(): void {
    const start = (this.expedientesPage - 1) * this.expedientesPageSize;
    this.pagedExpedientes = this.filteredExpedientes.slice(start, start + this.expedientesPageSize);
  }

  prevSeriesPage(): void {
    if (this.seriesPage > 1) {
      this.seriesPage--;
      this.repaginarSeries();
    }
  }

  nextSeriesPage(): void {
    if (this.seriesPage < this.totalSeriesPages) {
      this.seriesPage++;
      this.repaginarSeries();
    }
  }

  prevSubseriesPage(): void {
    if (this.subseriesPage > 1) {
      this.subseriesPage--;
      this.repaginarSubseries();
    }
  }

  nextSubseriesPage(): void {
    if (this.subseriesPage < this.totalSubseriesPages) {
      this.subseriesPage++;
      this.repaginarSubseries();
    }
  }

  prevExpedientesPage(): void {
    if (this.expedientesPage > 1) {
      this.expedientesPage--;
      this.repaginarExpedientes();
    }
  }

  nextExpedientesPage(): void {
    if (this.expedientesPage < this.totalExpedientesPages) {
      this.expedientesPage++;
      this.repaginarExpedientes();
    }
  }

  volverDashboard(): void {
    this.router.navigate(['/archivista/dashboard']);
  }
}
