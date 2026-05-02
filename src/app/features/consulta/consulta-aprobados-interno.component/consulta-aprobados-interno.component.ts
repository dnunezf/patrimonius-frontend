import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  ConsultaAprobadosApiService,
  ConsultaDocumentoRow,
  ConsultaExpedienteRow,
  ConsultaFiltrosOpciones,
  HistorialBusquedaRow,
} from '../../../../core/services/consulta-aprobados-api.service';
import { onConsultaPreviewLinkClick } from '../consulta-preview-link.util';
import { SolicitudAccesoDialogComponent } from '../solicitud-acceso-dialog-component/solicitud-acceso-dialog-component';

@Component({
  selector: 'app-consulta-aprobados-interno',
  standalone: true,
  imports: [CommonModule, FormsModule, SolicitudAccesoDialogComponent],
  templateUrl: './consulta-aprobados-interno.component.html',
  styleUrls: ['./consulta-aprobados-interno.component.css'],
})
export class ConsultaAprobadosInternoComponent implements OnInit {
  private readonly api = inject(ConsultaAprobadosApiService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);
  previewDocId: number | null = null;
  previewDocContext: any = null;

  @ViewChild('pdfHost') pdfHost?: ElementRef<HTMLDivElement>;

  private static readonly PDF_MAX_PAGES = 48;
  readonly pdfMaxPagesShown = ConsultaAprobadosInternoComponent.PDF_MAX_PAGES;

  /** Índices / anclas del HTML: scroll dentro del modal, sin navegar la SPA. */
  readonly onPreviewHtmlLinkClick = onConsultaPreviewLinkClick;

  public filtros: ConsultaFiltrosOpciones | null = null;
  public rows: ConsultaDocumentoRow[] = [];
  public totalItems = 0;
  public totalPages = 1;
  public page = 1;
  public pageSize = 10;
  public loading = false;
  public errorMsg = '';

  public vistaActual: 'documentos' | 'expedientes' = 'documentos';

  public codigoDocumentoFiltro = '';
  public nombreDocumentoFiltro = '';
  public serieId: string = '';
  public subserieId: string = '';
  public expedienteId: string = '';
  public dateFrom = '';
  public dateTo = '';

  public codigoExpedienteFiltro = '';
  public nombreExpedienteFiltro = '';
  public serieIdExp = '';
  public subserieIdExp = '';
  public expedienteDateFrom = '';
  public expedienteDateTo = '';

  public expedientesRows: ConsultaExpedienteRow[] = [];
  public totalExpedientes = 0;
  public totalExpedientesPages = 1;
  public expedientePage = 1;
  public expedientePageSize = 10;

  public documentosExpedienteOpen = false;
  public documentosExpedienteLoading = false;
  public documentosExpedienteError = '';
  public documentosExpedienteRows: ConsultaDocumentoRow[] = [];
  public selectedExpedienteDocs: ConsultaExpedienteRow | null = null;
  public zipDownloading = false;

  public sortBy = 'fecha_aprobacion';
  public sortDir: 'asc' | 'desc' = 'desc';

  public previewOpen = false;
  public previewTitle = '';
  public previewHtml: SafeHtml | null = null;
  public previewLoading = false;
  public previewMode: 'pdf' | 'html' | null = null;
  public pdfPreviewTruncated = false;

  private previewDocumentoId: number | null = null;

  /** Panel de anexos dentro del modal de vista previa */
  public previewAnexosOpen = false;
  public previewAnexos: any[] = [];
  public previewAnexosLoading = false;
  public previewAnexosError = '';
  /** Si el documento en vista previa tiene anexos (tras consultar la API de consulta). */
  public previewTieneAnexos = false;
  private previewAnexosMetaRows: any[] | null = null;

  public downloadErrorOpen = false;
  public downloadErrorTitle = 'No se pudo descargar';
  public downloadErrorMessage = '';

  public solicitudOpen = false;
  public selectedDocumento: ConsultaDocumentoRow | null = null;
  public usuarioSolicitanteId: number | null = null;
  public usuarioSolicitanteNombre = 'Usuario autenticado';

  /** Unidad con la que filtra el API (solo aplica a internos que no son administrador). */
  public filtroUnidadUsuario: number | null = null;
  public aplicaFiltroUnidad = false;

  /** ===== NUEVO: historial tipo navegador ===== */
  public historialBusquedas: HistorialBusquedaRow[] = [];
  public loadingHistorial = false;
  public mostrarSugerenciasHistorial = false;

  public ngOnInit(): void {
    this.api.getFilterOptions().subscribe({
      next: (f) => (this.filtros = f),
      error: () => (this.errorMsg = 'No se pudieron cargar los filtros.'),
    });

    this.cargarHistorialBusquedas();
    this.load();
  }

  public get subseriesFiltradas() {
    const list = this.filtros?.subseries ?? [];
    const sid = Number(this.serieId);
    if (!Number.isFinite(sid) || sid <= 0) return list;
    return list.filter((s) => Number(s.serie_id) === sid);
  }

  public get subseriesFiltradasExp() {
    const list = this.filtros?.subseries ?? [];
    const sid = Number(this.serieIdExp);
    if (!Number.isFinite(sid) || sid <= 0) return list;
    return list.filter((s) => Number(s.serie_id) === sid);
  }

  public load(): void {
    if (this.vistaActual === 'expedientes') {
      this.loadExpedientes();
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    this.api
      .searchInterno({
        vista: 'documentos',
        codigo: this.codigoDocumentoFiltro || undefined,
        titulo: this.nombreDocumentoFiltro || undefined,
        page: this.page,
        pageSize: this.pageSize,
        sortBy: this.sortBy,
        sortDir: this.sortDir,
        serieId: this.serieId || undefined,
        subserieId: this.subserieId || undefined,
        expedienteId: this.expedienteId || undefined,
        dateFrom: this.dateFrom || undefined,
        dateTo: this.dateTo || undefined,
      })
      .subscribe({
        next: (res) => {
          this.rows = res.items;
          this.totalItems = res.totalItems;
          this.totalPages = res.totalPages;
          this.page = res.page;
          this.filtroUnidadUsuario =
            res.filtroUnidadUsuario != null ? Number(res.filtroUnidadUsuario) : null;
          this.aplicaFiltroUnidad = !!res.aplicaFiltroUnidad;
          this.loading = false;
          this.cargarHistorialBusquedas();
        },
        error: (e) => {
          this.loading = false;
          this.errorMsg =
            e?.error?.message || 'Error al consultar documentos aprobados.';
        },
      });
  }

  public loadExpedientes(): void {
    this.loading = true;
    this.errorMsg = '';

    this.api
      .searchExpedientesInternos({
        vista: 'expedientes',
        codigo: this.codigoExpedienteFiltro || undefined,
        nombre: this.nombreExpedienteFiltro || undefined,
        page: this.expedientePage,
        pageSize: this.expedientePageSize,
        sortBy: 'nombre',
        sortDir: 'asc',
        serieId: this.serieIdExp || undefined,
        subserieId: this.subserieIdExp || undefined,
        dateFrom: this.expedienteDateFrom || undefined,
        dateTo: this.expedienteDateTo || undefined,
      })
      .subscribe({
        next: (res) => {
          this.expedientesRows = res.items ?? [];
          this.totalExpedientes = res.totalItems ?? 0;
          this.totalExpedientesPages = res.totalPages ?? 1;
          this.expedientePage = res.page ?? 1;
          this.loading = false;
          this.cargarHistorialBusquedas();
        },
        error: (e) => {
          this.loading = false;
          this.errorMsg =
            e?.error?.message || 'Error al consultar expedientes.';
        },
      });
  }

  public cambiarVista(vista: 'documentos' | 'expedientes'): void {
    if (this.vistaActual === vista) return;
    this.vistaActual = vista;
    this.errorMsg = '';
    if (vista === 'documentos') {
      this.page = 1;
      this.load();
      return;
    }
    this.expedientePage = 1;
    this.loadExpedientes();
  }

  public aplicarFiltrosConsulta(): void {
    this.page = 1;
    this.expedientePage = 1;

    if (this.vistaActual === 'expedientes') {
      this.loadExpedientes();
      return;
    }

    this.load();
  }

  public limpiarFiltrosConsulta(): void {
    this.codigoDocumentoFiltro = '';
    this.nombreDocumentoFiltro = '';
    this.serieId = '';
    this.subserieId = '';
    this.expedienteId = '';
    this.dateFrom = '';
    this.dateTo = '';

    this.codigoExpedienteFiltro = '';
    this.nombreExpedienteFiltro = '';
    this.serieIdExp = '';
    this.subserieIdExp = '';
    this.expedienteDateFrom = '';
    this.expedienteDateTo = '';

    this.page = 1;
    this.expedientePage = 1;

    if (this.vistaActual === 'expedientes') {
      this.loadExpedientes();
      return;
    }

    this.load();
  }

  public abrirDocumentosExpediente(row: ConsultaExpedienteRow): void {
    this.selectedExpedienteDocs = row;
    this.documentosExpedienteOpen = true;
    this.documentosExpedienteLoading = true;
    this.documentosExpedienteError = '';
    this.documentosExpedienteRows = [];

    this.api.getDocumentosAccesoExpediente(row.id, false).subscribe({
      next: (rows: ConsultaDocumentoRow[]) => {
        this.documentosExpedienteRows = (rows ?? []).map((doc) => ({
          ...doc,
          canView: true,
          canPreview: true,
          canDownload: true,
        }));
        this.documentosExpedienteLoading = false;
      },
      error: (e: { error?: { message?: string } }) => {
        this.documentosExpedienteLoading = false;
        this.documentosExpedienteError =
          e?.error?.message || 'No se pudieron cargar los documentos del expediente.';
      },
    });
  }

  public cerrarDocumentosExpediente(): void {
    this.documentosExpedienteOpen = false;
    this.documentosExpedienteLoading = false;
    this.documentosExpedienteError = '';
    this.documentosExpedienteRows = [];
    this.selectedExpedienteDocs = null;
  }

  public verDesdeExpediente(row: ConsultaDocumentoRow): void {
    this.previewDocId = row.id;
    this.previewDocContext = {
      ...row,
      expediente_nombre: this.selectedExpedienteDocs?.nombre || '',
      serie_nombre: this.selectedExpedienteDocs?.serie_nombre || '',
      subserie_nombre: this.selectedExpedienteDocs?.subserie_nombre || '',
    };
    this.cerrarDocumentosExpediente();
    this.ver(row);
  }

  public descargarDesdeExpediente(row: ConsultaDocumentoRow): void {
    this.descargar(row);
  }

  public descargarZipExpediente(row: ConsultaExpedienteRow): void {
    if (this.zipDownloading) return;
    this.zipDownloading = true;
    this.api.downloadExpedienteZip(row.id, false).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${row.codigo || 'expediente'}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        this.zipDownloading = false;
      },
      error: (err: unknown) => {
        this.zipDownloading = false;
        void this.handleDownloadHttpError(err);
      },
    });
  }

  public totalDocumentosConsultaExpediente(row: ConsultaExpedienteRow): number | string {
    if (row.total_documentos_consulta != null) {
      return Number(row.total_documentos_consulta);
    }
    return row.total_documentos ?? '—';
  }

  public get expedienteRangeStart(): number {
    if (this.totalExpedientes === 0) return 0;
    return (this.expedientePage - 1) * this.expedientePageSize + 1;
  }

  public get expedienteRangeEnd(): number {
    return Math.min(
      this.expedientePage * this.expedientePageSize,
      this.totalExpedientes,
    );
  }

  /** ===== NUEVO ===== */
  public cargarHistorialBusquedas(): void {
    this.loadingHistorial = true;

    this.api.getHistorialBusquedas(10).subscribe({
      next: (rows) => {
        this.historialBusquedas = rows ?? [];
        this.loadingHistorial = false;
      },
      error: () => {
        this.historialBusquedas = [];
        this.loadingHistorial = false;
      },
    });
  }

  /** ===== NUEVO ===== */
  public limpiarHistorialBusquedas(): void {
    this.api.clearHistorialBusquedas().subscribe({
      next: () => {
        this.historialBusquedas = [];
      },
      error: (e) => {
        this.errorMsg =
          e?.error?.message || 'No se pudo limpiar el historial de búsquedas.';
      },
    });
  }

  /** ===== NUEVO ===== */
  public usarBusquedaHistorial(item: HistorialBusquedaRow): void {
    const filtros = item.filtros || {};
    const vista =
      filtros['vista'] === 'expedientes' ? 'expedientes' : 'documentos';

    this.vistaActual = vista;

    this.codigoDocumentoFiltro = '';
    this.nombreDocumentoFiltro = '';
    this.serieId = '';
    this.subserieId = '';
    this.expedienteId = '';
    this.dateFrom = '';
    this.dateTo = '';

    this.codigoExpedienteFiltro = '';
    this.nombreExpedienteFiltro = '';
    this.serieIdExp = '';
    this.subserieIdExp = '';
    this.expedienteDateFrom = '';
    this.expedienteDateTo = '';

    if (vista === 'documentos') {
      this.codigoDocumentoFiltro = filtros['codigo']
        ? String(filtros['codigo'])
        : '';
      this.nombreDocumentoFiltro = filtros['titulo']
        ? String(filtros['titulo'])
        : '';
      this.serieId = filtros['serieId']
        ? String(filtros['serieId'])
        : '';
      this.subserieId = filtros['subserieId']
        ? String(filtros['subserieId'])
        : '';
      this.expedienteId = filtros['expedienteId']
        ? String(filtros['expedienteId'])
        : '';
      this.dateFrom = filtros['dateFrom'] ? String(filtros['dateFrom']) : '';
      this.dateTo = filtros['dateTo'] ? String(filtros['dateTo']) : '';
    } else {
      this.codigoExpedienteFiltro = filtros['codigo']
        ? String(filtros['codigo'])
        : '';
      this.nombreExpedienteFiltro = filtros['nombre']
        ? String(filtros['nombre'])
        : '';
      this.serieIdExp = filtros['serieId']
        ? String(filtros['serieId'])
        : '';
      this.subserieIdExp = filtros['subserieId']
        ? String(filtros['subserieId'])
        : '';
      this.expedienteDateFrom = filtros['dateFrom']
        ? String(filtros['dateFrom'])
        : '';
      this.expedienteDateTo = filtros['dateTo']
        ? String(filtros['dateTo'])
        : '';
    }

    if (filtros['sortBy']) {
      this.sortBy = String(filtros['sortBy']);
    }
    if (filtros['sortDir'] === 'asc' || filtros['sortDir'] === 'desc') {
      this.sortDir = filtros['sortDir'];
    }

    this.page = 1;
    this.expedientePage = 1;
    this.mostrarSugerenciasHistorial = false;
  }

  /** ===== NUEVO ===== */
  public formatHistorialResumen(item: HistorialBusquedaRow): string {
    const filtros = item.filtros || {};
    const vista =
      filtros['vista'] === 'expedientes' ? 'expedientes' : 'documentos';

    const partes: string[] = [];

    if (vista === 'documentos') {
      if (filtros['codigo']) partes.push(`Código: ${String(filtros['codigo'])}`);
      if (filtros['titulo']) partes.push(`Nombre: ${String(filtros['titulo'])}`);
      if (filtros['serieId']) partes.push('Serie');
      if (filtros['subserieId']) partes.push('Subserie');
      if (filtros['expedienteId']) partes.push('Expediente');
      if (filtros['dateFrom'] || filtros['dateTo']) partes.push('Rango de fecha');
    } else {
      if (filtros['codigo']) partes.push(`Código: ${String(filtros['codigo'])}`);
      if (filtros['nombre']) partes.push(`Nombre: ${String(filtros['nombre'])}`);
      if (filtros['serieId']) partes.push('Serie');
      if (filtros['subserieId']) partes.push('Subserie');
      if (filtros['dateFrom'] || filtros['dateTo']) partes.push('Rango de fecha');
    }

    return partes.length ? partes.join(' · ') : 'Búsqueda reciente';
  }

  /** ===== NUEVO ===== */
  public formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('es-CR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  public labelVistaHistorial(item: HistorialBusquedaRow): string {
    return item.filtros?.['vista'] === 'expedientes'
      ? 'Expedientes'
      : 'Documentos';
  }

  public onSort(col: string): void {
    if (this.vistaActual !== 'documentos') return;
    if (this.sortBy === col) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = col;
      this.sortDir = 'desc';
    }
    this.page = 1;
    this.load();
  }

  public prevPage(): void {
    if (this.vistaActual === 'documentos') {
      if (this.page > 1) {
        this.page--;
        this.load();
      }
      return;
    }
    if (this.expedientePage > 1) {
      this.expedientePage--;
      this.loadExpedientes();
    }
  }

  public nextPage(): void {
    if (this.vistaActual === 'documentos') {
      if (this.page < this.totalPages) {
        this.page++;
        this.load();
      }
      return;
    }
    if (this.expedientePage < this.totalExpedientesPages) {
      this.expedientePage++;
      this.loadExpedientes();
    }
  }

  public tieneAccesoAlDocumento(row: ConsultaDocumentoRow): boolean {
    return row.canDownload !== false && row.canPreview !== false;
  }

  public abrirSolicitud(row: ConsultaDocumentoRow): void {
    this.selectedDocumento = row;
    this.solicitudOpen = true;
  }

  public cerrarSolicitud(): void {
    this.solicitudOpen = false;
    this.selectedDocumento = null;
  }

  public solicitudCreada(): void {
    this.cerrarSolicitud();
  }

  public formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('es-CR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  public ver(row: ConsultaDocumentoRow): void {
    if (row.canDownload === false) return;
    this.resetPreviewAnexos();
    this.previewDocId = row.id;

    if (!this.previewDocContext || this.previewDocContext.id !== row.id) {
      this.previewDocContext = row;
    }

    this.previewDocumentoId = row.id;
    this.previewOpen = true;
    this.previewLoading = true;
    this.previewTitle = row.titulo;
    this.previewHtml = null;
    this.previewMode = null;
    this.pdfPreviewTruncated = false;
    this.clearPdfHost();

    this.api.getPreviewPdf(row.id).subscribe({
      next: (blob) => void this.handlePreviewPdfBlob(blob, row),
      error: () => this.cargarVistaPreviaHtml(row),
    });
    this.loadPreviewAnexosMeta(row.id);
  }

  private async handlePreviewPdfBlob(
    blob: Blob,
    row: ConsultaDocumentoRow,
  ): Promise<void> {
    if (!blob?.size) {
      this.cargarVistaPreviaHtml(row);
      return;
    }
    const mime = (blob.type || '').toLowerCase();
    if (mime.includes('json')) {
      this.cargarVistaPreviaHtml(row);
      return;
    }
    const isPdfMime =
      mime.includes('pdf') || mime.includes('octet-stream') || mime === '';
    if (!isPdfMime && !(await this.blobStartsWithPdfSignature(blob))) {
      this.cargarVistaPreviaHtml(row);
      return;
    }
    this.previewMode = 'pdf';
    this.previewLoading = false;
    this.cdr.detectChanges();
    setTimeout(() => void this.renderPdfIntoHost(blob), 0);
  }

  private async blobStartsWithPdfSignature(blob: Blob): Promise<boolean> {
    if (blob.size < 4) return false;
    const buf = await blob.slice(0, 4).arrayBuffer();
    const u = new Uint8Array(buf);
    return u[0] === 0x25 && u[1] === 0x50 && u[2] === 0x44 && u[3] === 0x46;
  }

  private cargarVistaPreviaHtml(row: ConsultaDocumentoRow): void {
    this.previewMode = 'html';
    this.api.getPreview(row.id).subscribe({
      next: (p) => {
        this.previewTitle = p.titulo || this.previewTitle;
        const html = String(p.contenido || '').trim();
        this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(html);
        this.previewLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.previewLoading = false;
        this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(
          '<p>No se pudo cargar la vista previa.</p>',
        );
        this.cdr.markForCheck();
      },
    });
  }

  private clearPdfHost(): void {
    const el = this.pdfHost?.nativeElement;
    if (el) el.innerHTML = '';
  }

  private async renderPdfIntoHost(blob: Blob, attempt = 0): Promise<void> {
    const host = this.pdfHost?.nativeElement;
    if (!host) {
      if (attempt < 8) {
        setTimeout(() => void this.renderPdfIntoHost(blob, attempt + 1), 40);
        return;
      }
      this.cargarVistaPreviaHtmlDesdeIdGuardado();
      return;
    }
    host.innerHTML = '';
    try {
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
      GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

      const data = await blob.arrayBuffer();
      const pdf = await getDocument({ data }).promise;
      const total = pdf.numPages;
      const max = ConsultaAprobadosInternoComponent.PDF_MAX_PAGES;
      const pagesToRender = Math.min(total, max);
      this.pdfPreviewTruncated = total > max;
      this.cdr.markForCheck();

      const scale = 1.35;
      for (let i = 1; i <= pagesToRender; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) continue;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.className = 'consulta-pdf-canvas';
        canvas.setAttribute('draggable', 'false');
        const task = page.render({ canvasContext: ctx, viewport });
        await task.promise;
        host.appendChild(canvas);
      }
    } catch {
      host.innerHTML = '';
      this.previewMode = 'html';
      this.previewLoading = true;
      this.cdr.detectChanges();
      this.cargarVistaPreviaHtmlDesdeIdGuardado();
    }
  }

  private cargarVistaPreviaHtmlDesdeIdGuardado(): void {
    const id = this.previewDocumentoId;
    if (id == null) {
      this.previewLoading = false;
      this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(
        '<p>No se pudo cargar la vista previa.</p>',
      );
      this.cdr.markForCheck();
      return;
    }
    this.cargarVistaPreviaHtml({ id, codigo: '', titulo: this.previewTitle } as ConsultaDocumentoRow);
  }

  public cerrarPreview(): void {
    this.previewOpen = false;
    this.previewHtml = null;
    this.previewMode = null;
    this.pdfPreviewTruncated = false;
    this.previewDocumentoId = null;
    this.previewDocId = null;
    this.previewDocContext = null;
    this.clearPdfHost();
    this.resetPreviewAnexos();
  }

  public togglePreviewAnexos(): void {
    const docId = Number(this.previewDocId ?? this.previewDocumentoId);
    if (!Number.isFinite(docId) || docId <= 0) return;
    this.previewAnexosOpen = !this.previewAnexosOpen;
    if (this.previewAnexosOpen) {
      this.cargarPreviewAnexos();
    } else {
      this.previewAnexosError = '';
    }
    this.cdr.markForCheck();
  }

  private resetPreviewAnexos(): void {
    this.previewAnexosOpen = false;
    this.previewAnexos = [];
    this.previewAnexosLoading = false;
    this.previewAnexosError = '';
    this.previewTieneAnexos = false;
    this.previewAnexosMetaRows = null;
  }

  private loadPreviewAnexosMeta(docId: number): void {
    if (!Number.isFinite(docId) || docId <= 0) return;
    this.previewTieneAnexos = false;
    this.previewAnexosMetaRows = null;
    this.api.listAnexosConsulta(docId).subscribe({
      next: (rows) => {
        const actual = Number(this.previewDocId ?? this.previewDocumentoId);
        if (actual !== docId) return;
        const list = rows ?? [];
        this.previewAnexosMetaRows = list;
        this.previewTieneAnexos = list.length > 0;
        this.cdr.markForCheck();
      },
      error: () => {
        const actual = Number(this.previewDocId ?? this.previewDocumentoId);
        if (actual !== docId) return;
        this.previewAnexosMetaRows = [];
        this.previewTieneAnexos = false;
        this.cdr.markForCheck();
      },
    });
  }

  private cargarPreviewAnexos(): void {
    const id = Number(this.previewDocId ?? this.previewDocumentoId);
    if (!Number.isFinite(id) || id <= 0) return;
    if (this.previewAnexosMetaRows != null && this.previewAnexosMetaRows.length > 0) {
      this.previewAnexosLoading = false;
      this.previewAnexos = [...this.previewAnexosMetaRows];
      this.previewAnexosError = '';
      this.cdr.markForCheck();
      return;
    }
    this.previewAnexosLoading = true;
    this.previewAnexosError = '';
    this.previewAnexos = [];
    this.api.listAnexosConsulta(id).subscribe({
      next: (rows) => {
        this.previewAnexosLoading = false;
        this.previewAnexos = rows ?? [];
        this.cdr.markForCheck();
      },
      error: (e: { error?: { message?: string } }) => {
        this.previewAnexosLoading = false;
        this.previewAnexos = [];
        this.previewAnexosError =
          e?.error?.message || 'No se pudieron cargar los anexos.';
        this.cdr.markForCheck();
      },
    });
  }

  public descargarPreviewAnexo(anexo: any): void {
    const docId = Number(this.previewDocId ?? this.previewDocumentoId);
    if (!Number.isFinite(docId) || docId <= 0) return;
    const anexoId = Number(anexo?.id ?? anexo?.anexo_id);
    if (!Number.isFinite(anexoId) || anexoId <= 0) return;
    const nombre =
      String(anexo?.nombre_original ?? anexo?.nombre ?? `anexo_${anexoId}`).trim() ||
      `anexo_${anexoId}`;
    this.previewAnexosError = '';
    this.api.downloadAnexoConsulta(docId, anexoId).subscribe({
      next: (blob) => void this.handleAnexoDownloadBlob(blob, nombre),
      error: (err: unknown) => void this.handleAnexoDownloadError(err),
    });
  }

  private async handleAnexoDownloadBlob(blob: Blob, filename: string): Promise<void> {
    const mime = (blob.type || '').toLowerCase();
    if (mime.includes('json')) {
      try {
        const t = await blob.text();
        const j = JSON.parse(t) as { message?: string };
        this.previewAnexosError =
          j.message?.trim() || 'No se pudo descargar el anexo.';
      } catch {
        this.previewAnexosError = 'No se pudo descargar el anexo.';
      }
      this.cdr.markForCheck();
      return;
    }
    this.guardarBlobAnexo(blob, filename);
  }

  private async handleAnexoDownloadError(err: unknown): Promise<void> {
    let msg = 'No se pudo descargar el anexo.';
    const e = err as {
      error?: Blob | { message?: string };
      message?: string;
    };
    if (e.error instanceof Blob) {
      try {
        const t = await e.error.text();
        const j = JSON.parse(t) as { message?: string };
        if (j.message?.trim()) msg = j.message.trim();
      } catch {
        /* mantener msg */
      }
    } else if (e.error && typeof e.error === 'object' && 'message' in e.error) {
      msg = String((e.error as { message?: string }).message || msg);
    }
    this.previewAnexosError = msg;
    this.cdr.markForCheck();
  }

  private guardarBlobAnexo(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  public descargar(row: ConsultaDocumentoRow): void {
    if (row.canDownload === false) return;

    this.api.downloadConsulta(row.id).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) {
          this.downloadErrorTitle = 'No se pudo descargar';
          this.downloadErrorMessage = 'La descarga no devolvio contenido.';
          this.downloadErrorOpen = true;
          return;
        }
        const filename =
          this.getFilenameFromContentDisposition(response.headers.get('content-disposition')) ||
          this.getDefaultDownloadName(row, blob.type);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: unknown) => {
        void this.handleDownloadHttpError(err);
      },
    });
  }

  private getFilenameFromContentDisposition(value: string | null): string | null {
    if (!value) return null;
    const utf8 = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(value);
    if (utf8?.[1]) {
      try {
        return decodeURIComponent(utf8[1]).replace(/^["']|["']$/g, '').trim() || null;
      } catch {
        return utf8[1].replace(/^["']|["']$/g, '').trim() || null;
      }
    }
    const plain = /filename\s*=\s*("?)([^";]+)\1/i.exec(value);
    return plain?.[2]?.trim() || null;
  }

  private getDefaultDownloadName(row: ConsultaDocumentoRow, mimeType: string): string {
    const base = String(row.codigo || 'documento').trim() || 'documento';
    const ext = String(mimeType || '').toLowerCase().includes('zip') ? 'zip' : 'pdf';
    return `${base}.${ext}`;
  }

  private async handleDownloadHttpError(err: unknown): Promise<void> {
    let msg =
      'No se pudo descargar el documento. Intente de nuevo o contacte a soporte.';
    const e = err as {
      error?: Blob | { message?: string };
      message?: string;
    };
    if (e.error instanceof Blob) {
      try {
        const t = await e.error.text();
        const j = JSON.parse(t) as { message?: string };
        if (j.message) msg = j.message;
      } catch {
        /* mantener mensaje por defecto */
      }
    } else if (e.error && typeof e.error === 'object' && 'message' in e.error) {
      msg = String((e.error as { message?: string }).message || msg);
    }
    this.downloadErrorTitle = 'No se pudo descargar';
    this.downloadErrorMessage = msg;
    this.downloadErrorOpen = true;
  }

  public cerrarErrorDescarga(): void {
    this.downloadErrorOpen = false;
    this.downloadErrorMessage = '';
  }

  public volver(): void {
    this.router.navigate(['/usuario/dashboard']);
  }

  public get rangeStart(): number {
    if (this.totalItems === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  public get rangeEnd(): number {
    if (this.totalItems === 0) return 0;
    return Math.min(this.page * this.pageSize, this.totalItems);
  }

  public onFocusBusqueda(): void {
    this.mostrarSugerenciasHistorial = this.historialVisible.length > 0;
  }

  public onBlurBusqueda(): void {
    setTimeout(() => {
      this.mostrarSugerenciasHistorial = false;
    }, 150);
  }

  public get historialVisible(): HistorialBusquedaRow[] {
    const texto = this.nombreDocumentoFiltro.trim().toLowerCase();

    const base = (this.historialBusquedas || []).filter(
      (item) => !!String(item.texto_busqueda || '').trim(),
    );

    if (!texto) {
      return base.slice(0, 8);
    }

    return base
      .filter((item) =>
        String(item.texto_busqueda || '')
          .toLowerCase()
          .includes(texto),
      )
      .slice(0, 8);
  }

  public seleccionarSugerenciaHistorial(item: HistorialBusquedaRow): void {
    this.usarBusquedaHistorial(item);
    this.mostrarSugerenciasHistorial = false;
  }

  abrirClasificacionDesdePreview(): void {
    const docId = this.previewDocId;
    const context = this.previewDocContext;

    if (!docId) return;

    this.cerrarPreview();

    this.router.navigate(
      ['/consulta/clasificacion-documento', docId],
      {
        state: {
          expedienteNombre: context?.expediente_nombre || '',
          serieNombre: context?.serie_nombre || '',
          subserieNombre: context?.subserie_nombre || '',
          soloLectura: true,
          origen: 'consulta-interno',
        },
      }
    );
  }
}
