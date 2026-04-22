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
} from '../../../core/services/consulta-aprobados-api.service';
import { onConsultaPreviewLinkClick } from './consulta-preview-link.util';
import { SolicitudAccesoDialogComponent } from './solicitud-acceso-dialog-component';

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
  public categoriaId: string = '';
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

    const qCompuesta = [this.codigoDocumentoFiltro.trim(), this.nombreDocumentoFiltro.trim()]
      .filter(Boolean)
      .join(' ');

    this.api
      .searchInterno({
        q: qCompuesta || undefined,
        page: this.page,
        pageSize: this.pageSize,
        sortBy: this.sortBy,
        sortDir: this.sortDir,
        categoriaId: this.categoriaId || undefined,
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

          /** refresca historial porque esta búsqueda ya quedó guardada en backend */
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

    const qCompuesta = [this.codigoExpedienteFiltro.trim(), this.nombreExpedienteFiltro.trim()]
      .filter(Boolean)
      .join(' ');

    this.api
      .searchExpedientesInternos({
        q: qCompuesta || undefined,
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
    this.load();
  }

  public limpiarFiltrosConsulta(): void {
    this.codigoDocumentoFiltro = '';
    this.nombreDocumentoFiltro = '';
    this.categoriaId = '';
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
    this.load();
  }

  public categoriaClass(nombre: string | null | undefined): string {
    const n = String(nombre || '').toLowerCase();
    if (n.includes('informe')) return 'cat-blue';
    if (n.includes('protocolo')) return 'cat-green';
    if (n.includes('catálogo') || n.includes('catalogo')) return 'cat-cyan';
    if (n.includes('inventario')) return 'cat-amber';
    if (n.includes('estudio') || n.includes('técnico')) return 'cat-orange';
    return 'cat-neutral';
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

    this.nombreDocumentoFiltro = item.texto_busqueda || '';
    this.codigoDocumentoFiltro = filtros['codigo'] ? String(filtros['codigo']) : '';
    this.categoriaId = filtros['categoriaId'] ? String(filtros['categoriaId']) : '';
    this.serieId = filtros['serieId'] ? String(filtros['serieId']) : '';
    this.subserieId = filtros['subserieId'] ? String(filtros['subserieId']) : '';
    this.expedienteId = filtros['expedienteId'] ? String(filtros['expedienteId']) : '';
    this.dateFrom = filtros['dateFrom'] || '';
    this.dateTo = filtros['dateTo'] || '';

    this.codigoExpedienteFiltro = filtros['codigoExpediente'] ? String(filtros['codigoExpediente']) : '';
    this.nombreExpedienteFiltro = filtros['nombreExpediente'] ? String(filtros['nombreExpediente']) : '';
    this.serieIdExp = filtros['serieIdExp'] ? String(filtros['serieIdExp']) : '';
    this.subserieIdExp = filtros['subserieIdExp'] ? String(filtros['subserieIdExp']) : '';
    this.expedienteDateFrom = filtros['expedienteDateFrom'] || '';
    this.expedienteDateTo = filtros['expedienteDateTo'] || '';

    if (filtros['sortBy']) {
      this.sortBy = String(filtros['sortBy']);
    }
    if (filtros['sortDir'] === 'asc' || filtros['sortDir'] === 'desc') {
      this.sortDir = filtros['sortDir'];
    }

    this.page = 1;
    this.expedientePage = 1;
    this.load();
  }

  /** ===== NUEVO ===== */
  public formatHistorialResumen(item: HistorialBusquedaRow): string {
    const filtros = item.filtros || {};
    const partes: string[] = [];

    if (item.texto_busqueda) {
      partes.push(`"${item.texto_busqueda}"`);
    }
    if (filtros['categoriaId']) partes.push('Categoría');
    if (filtros['serieId']) partes.push('Serie');
    if (filtros['subserieId']) partes.push('Subserie');
    if (filtros['expedienteId']) partes.push('Expediente');
    if (filtros['dateFrom'] || filtros['dateTo']) partes.push('Rango de fecha');

    return partes.length ? partes.join(' · ') : 'Búsqueda sin texto';
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
  }

  public descargar(row: ConsultaDocumentoRow): void {
    if (row.canDownload === false) return;

    this.api.downloadConsulta(row.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${row.codigo || 'documento'}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: unknown) => {
        void this.handleDownloadHttpError(err);
      },
    });
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
      ['/archivista/clasificacion-documento', docId],
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
