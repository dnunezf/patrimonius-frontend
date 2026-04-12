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
import { SolicitudAccesoDialogComponent } from './solicitud-acceso-dialog-component';
import { SolicitudAccesoExpedienteDialogComponent } from './solicitud-acceso-expediente-dialog-component';
import {
  ConsultaAprobadosApiService,
  ConsultaDocumentoRow,
  ConsultaFiltrosOpciones,
  ConsultaExpedienteRow,
  HistorialBusquedaRow,
} from '../../../core/services/consulta-aprobados-api.service';
import { onConsultaPreviewLinkClick } from './consulta-preview-link.util';


@Component({
  selector: 'app-consulta-aprobados-externo',
  standalone: true,
  imports: [CommonModule, FormsModule, SolicitudAccesoDialogComponent, SolicitudAccesoExpedienteDialogComponent],
  templateUrl: './consulta-aprobados-externo.component.html',
  styleUrls: ['./consulta-aprobados-externo.component.css'],
})
export class ConsultaAprobadosExternoComponent implements OnInit {
  private readonly api = inject(ConsultaAprobadosApiService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('pdfHost') pdfHost?: ElementRef<HTMLDivElement>;

  private static readonly PDF_MAX_PAGES = 48;
  readonly pdfMaxPagesShown = ConsultaAprobadosExternoComponent.PDF_MAX_PAGES;

  readonly onPreviewHtmlLinkClick = onConsultaPreviewLinkClick;

  filtros: ConsultaFiltrosOpciones | null = null;
  rows: ConsultaDocumentoRow[] = [];
  /** Total de filas en la tabla (incluye sin permiso). */
  totalItems = 0;
  /** Filas con permiso VIEW / listas para descargar (solo estos cuentan como “aprobados” para el banner). */
  totalDescargables = 0;
  totalPages = 1;
  page = 1;
  pageSize = 10;
  loading = false;
  errorMsg = '';

  /** Fallo al cargar opciones de categoría (la búsqueda puede seguir funcionando). */
  filtersError = '';

  q = '';
  categoriaId = '';
  dateFrom = '';
  dateTo = '';

  historialBusquedas: HistorialBusquedaRow[] = [];
  loadingHistorial = false;
  mostrarSugerenciasHistorial = false;

  previewOpen = false;
  previewTitle = '';
  previewHtml: SafeHtml | null = null;
  previewLoading = false;
  previewMode: 'pdf' | 'html' | null = null;
  pdfPreviewTruncated = false;
  private previewDocumentoId: number | null = null;

  solicitudOpen = false;
  selectedDocumento: ConsultaDocumentoRow | null = null;

  vistaActual: 'documentos' | 'expedientes' = 'documentos';

  expedientesRows: ConsultaExpedienteRow[] = [];
  totalExpedientes = 0;
  totalExpedientesPages = 1;
  expedientePage = 1;
  expedientePageSize = 10;

  solicitudExpedienteOpen = false;
  selectedExpediente: ConsultaExpedienteRow | null = null;

  documentosExpedienteOpen = false;
  documentosExpedienteLoading = false;
  documentosExpedienteError = '';
  documentosExpedienteRows: ConsultaDocumentoRow[] = [];
  selectedExpedienteDocs: ConsultaExpedienteRow | null = null;

  codigoDocumentoFiltro = '';
  nombreDocumentoFiltro = '';

  codigoExpedienteFiltro = '';
  nombreExpedienteFiltro = '';
  serieId = '';
  subserieId = '';
  soloConElegiblesFiltro = '';

  /** Modal de error al fallar la descarga (sustituye alert nativo). */
  downloadErrorOpen = false;
  downloadErrorTitle = 'No se pudo descargar';
  downloadErrorMessage = '';

  /**
   * Aviso previo: el navegador puede mostrar su propio permiso (“Descargar varios archivos”).
   * Eso no se puede sustituir por UI web; solo informamos antes de iniciar la descarga.
   */
  browserDownloadHintOpen = false;
  pendingDownloadRow: ConsultaDocumentoRow | null = null;
  noMostrarAvisoDescarga = false;

  private static readonly LS_AVISO_DESCARGA = 'patrimonius_aviso_descarga_navegador_v1';

  // Por ahora quedan así; luego puedes llenarlos desde tu auth/user service
  usuarioSolicitanteId: number | null = null;
  usuarioSolicitanteNombre = 'Usuario autenticado';

  get rangeStart(): number {
    if (this.totalItems === 0) return 0;
    return ((this.page - 1) * this.pageSize) + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.page * this.pageSize, this.totalItems);
  }

  get historialVisible(): HistorialBusquedaRow[] {
    const texto = this.q.trim().toLowerCase();

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

  tieneAccesoAlDocumento(row: ConsultaDocumentoRow): boolean {
    return row.canDownload === true;
  }

  ngOnInit(): void {
    this.api.getFilterOptions(true).subscribe({
      next: (f) => {
        this.filtros = f;
        this.filtersError = '';
      },
      error: () => {
        this.filtersError =
          'No se pudieron cargar las categorías. Puede seguir buscando por texto y fechas.';
      },
    });

    this.cargarHistorialBusquedas();
    this.load();
  }

  load(): void {
    if (this.vistaActual === 'expedientes') {
      this.loadExpedientes();
      return;
    }
    this.loading = true;
    this.errorMsg = '';

    const qCompuesta = [
      this.codigoDocumentoFiltro.trim(),
      this.nombreDocumentoFiltro.trim(),
    ]
      .filter(Boolean)
      .join(' ');

    this.api
      .searchExterno({
        q: qCompuesta || undefined,
        page: this.page,
        pageSize: this.pageSize,
        sortBy: 'fecha_aprobacion',
        sortDir: 'desc',
        categoriaId: this.categoriaId || undefined,
        dateFrom: this.dateFrom || undefined,
        dateTo: this.dateTo || undefined,
      })
      .subscribe({
        next: (res) => {
          this.rows = res.items;
          this.totalItems = res.totalItems;
          this.totalDescargables = res.totalDescargables ?? 0;
          this.totalPages = res.totalPages;
          this.page = res.page;
          this.loading = false;
          this.cargarHistorialBusquedas();
        },
        error: (e) => {
          this.loading = false;
          this.errorMsg =
            e?.error?.message || 'Error al consultar documentos disponibles.';
        },
      });
  }

  cargarHistorialBusquedas(): void {
    this.loadingHistorial = true;
    this.api.getHistorialBusquedas(8).subscribe({
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

  limpiarHistorialBusquedas(): void {
    this.api.clearHistorialBusquedas().subscribe({
      next: () => {
        this.historialBusquedas = [];
        this.mostrarSugerenciasHistorial = false;
      },
      error: (e) => {
        this.errorMsg =
          e?.error?.message || 'No se pudo limpiar el historial de búsquedas.';
      },
    });
  }

  usarBusquedaHistorial(item: HistorialBusquedaRow): void {
    const filtros = item.filtros || {};

    this.codigoDocumentoFiltro = filtros['codigo'] ? String(filtros['codigo']) : '';
    this.nombreDocumentoFiltro = filtros['titulo'] ? String(filtros['titulo']) : '';
    this.categoriaId = filtros['categoriaId'] ? String(filtros['categoriaId']) : '';
    this.dateFrom = filtros['dateFrom'] || '';
    this.dateTo = filtros['dateTo'] || '';

    this.codigoExpedienteFiltro = filtros['codigo'] ? String(filtros['codigo']) : '';
    this.nombreExpedienteFiltro = filtros['nombre'] ? String(filtros['nombre']) : '';
    this.serieId = filtros['serieId'] ? String(filtros['serieId']) : '';
    this.subserieId = filtros['subserieId'] ? String(filtros['subserieId']) : '';
    this.soloConElegiblesFiltro = filtros['soloConElegibles']
      ? String(filtros['soloConElegibles'])
      : '';

    this.page = 1;
    this.expedientePage = 1;
    this.load();
  }

  get subseriesFiltradas() {
    const list = this.filtros?.subseries ?? [];
    const sid = Number(this.serieId);
    if (!Number.isFinite(sid) || sid <= 0) return list;
    return list.filter((s) => Number(s.serie_id) === sid);
  }

  aplicarFiltrosConsulta(): void {
    this.page = 1;
    this.expedientePage = 1;
    this.load();
  }

  limpiarFiltrosConsulta(): void {
    this.codigoDocumentoFiltro = '';
    this.nombreDocumentoFiltro = '';
    this.categoriaId = '';
    this.dateFrom = '';
    this.dateTo = '';

    this.codigoExpedienteFiltro = '';
    this.nombreExpedienteFiltro = '';
    this.serieId = '';
    this.subserieId = '';
    this.soloConElegiblesFiltro = '';

    this.q = '';
    this.page = 1;
    this.expedientePage = 1;
    this.load();
  }

  seleccionarSugerenciaHistorial(item: HistorialBusquedaRow): void {
    this.usarBusquedaHistorial(item);
    this.mostrarSugerenciasHistorial = false;
  }

  onFocusBusqueda(): void {
    this.mostrarSugerenciasHistorial = this.historialVisible.length > 0;
  }

  onBlurBusqueda(): void {
    setTimeout(() => {
      this.mostrarSugerenciasHistorial = false;
    }, 150);
  }

  formatDateTime(iso: string | null | undefined): string {
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

  prevPage(): void {
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

  nextPage(): void {
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

  formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);

    return d.toLocaleDateString('es-CR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  categoriaClass(nombre: string | null | undefined): string {
    const n = String(nombre || '').toLowerCase();
    if (n.includes('informe')) return 'cat-blue';
    if (n.includes('protocolo')) return 'cat-green';
    if (n.includes('catálogo') || n.includes('catalogo')) return 'cat-cyan';
    if (n.includes('inventario')) return 'cat-amber';
    if (n.includes('estudio') || n.includes('técnico')) return 'cat-orange';
    return 'cat-neutral';
  }

  ver(row: ConsultaDocumentoRow): void {
    if (row.canDownload !== true) return;

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
      const max = ConsultaAprobadosExternoComponent.PDF_MAX_PAGES;
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

  cerrarPreview(): void {
    this.previewOpen = false;
    this.previewHtml = null;
    this.previewMode = null;
    this.pdfPreviewTruncated = false;
    this.previewDocumentoId = null;
    this.clearPdfHost();
  }

  descargar(row: ConsultaDocumentoRow): void {
    if (row.canDownload !== true) return;

    try {
      if (
        typeof localStorage !== 'undefined' &&
        localStorage.getItem(ConsultaAprobadosExternoComponent.LS_AVISO_DESCARGA) === '1'
      ) {
        this.ejecutarDescarga(row);
        return;
      }
    } catch {}

    this.pendingDownloadRow = row;
    this.noMostrarAvisoDescarga = false;
    this.browserDownloadHintOpen = true;
  }

  cancelarAvisoDescarga(): void {
    this.browserDownloadHintOpen = false;
    this.pendingDownloadRow = null;
  }

  confirmarAvisoDescarga(): void {
    const row = this.pendingDownloadRow;
    if (!row) {
      this.cancelarAvisoDescarga();
      return;
    }

    if (this.noMostrarAvisoDescarga) {
      try {
        localStorage.setItem(ConsultaAprobadosExternoComponent.LS_AVISO_DESCARGA, '1');
      } catch {}
    }

    this.browserDownloadHintOpen = false;
    this.pendingDownloadRow = null;
    this.ejecutarDescarga(row);
  }

  private ejecutarDescarga(row: ConsultaDocumentoRow): void {
    this.api.download(row.id).subscribe({
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
    let msg = 'No se pudo descargar el documento. Intente de nuevo o contacte a soporte.';
    const e = err as {
      error?: Blob | { message?: string };
      message?: string;
    };
    if (e.error instanceof Blob) {
      try {
        const t = await e.error.text();
        const j = JSON.parse(t) as { message?: string };
        if (j.message) msg = j.message;
      } catch {}
    } else if (e.error && typeof e.error === 'object' && 'message' in e.error) {
      msg = String((e.error as { message?: string }).message || msg);
    }
    this.abrirErrorDescarga(msg);
  }

  abrirErrorDescarga(mensaje: string): void {
    this.downloadErrorTitle = 'No se pudo descargar';
    this.downloadErrorMessage = mensaje;
    this.downloadErrorOpen = true;
  }

  cerrarErrorDescarga(): void {
    this.downloadErrorOpen = false;
    this.downloadErrorMessage = '';
  }

  abrirSolicitud(row: ConsultaDocumentoRow): void {
    this.selectedDocumento = row;
    this.solicitudOpen = true;
  }

  cerrarSolicitud(): void {
    this.solicitudOpen = false;
    this.selectedDocumento = null;
  }

  solicitudCreada(): void {
    this.cerrarSolicitud();
  }

  volver(): void {
    this.router.navigate(['/dashboard']);
  }
  loadExpedientes(): void {
    this.loading = true;
    this.errorMsg = '';

    const qCompuesta = [
      this.codigoExpedienteFiltro.trim(),
      this.nombreExpedienteFiltro.trim(),
    ]
      .filter(Boolean)
      .join(' ');

    this.api
      .searchExpedientesExternos({
        q: qCompuesta || undefined,
        page: this.expedientePage,
        pageSize: this.expedientePageSize,
        sortBy: 'nombre',
        sortDir: 'asc',
        serieId: this.serieId || undefined,
        subserieId: this.subserieId || undefined,
      })
      .subscribe({
        next: (res) => {
          let items = res.items ?? [];

          if (this.soloConElegiblesFiltro === '1') {
            items = items.filter(
              (row) => Number(row.total_documentos_elegibles ?? 0) > 0,
            );
          }

          this.expedientesRows = items;
          this.totalExpedientes = this.soloConElegiblesFiltro === '1'
            ? items.length
            : (res.totalItems ?? 0);
          this.totalExpedientesPages = this.soloConElegiblesFiltro === '1'
            ? 1
            : (res.totalPages ?? 1);
          this.expedientePage = this.soloConElegiblesFiltro === '1'
            ? 1
            : (res.page ?? 1);

          this.loading = false;
          this.cargarHistorialBusquedas();
        },
        error: (e) => {
          this.loading = false;
          this.errorMsg =
            e?.error?.message || 'Error al consultar expedientes disponibles.';
        },
      });
  }

  cambiarVista(vista: 'documentos' | 'expedientes'): void {
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
  abrirSolicitudExpediente(row: ConsultaExpedienteRow): void {
    this.selectedExpediente = row;
    this.solicitudExpedienteOpen = true;
  }

  cerrarSolicitudExpediente(): void {
    this.solicitudExpedienteOpen = false;
    this.selectedExpediente = null;
  }

  solicitudExpedienteCreada(): void {
    this.cerrarSolicitudExpediente();
  }
  totalElegiblesExpediente(row: ConsultaExpedienteRow): number | string {
    return row.total_documentos_elegibles ?? '—';
  }
  get expedienteRangeStart(): number {
    if (this.totalExpedientes === 0) return 0;
    return ((this.expedientePage - 1) * this.expedientePageSize) + 1;
  }

  get expedienteRangeEnd(): number {
    return Math.min(
      this.expedientePage * this.expedientePageSize,
      this.totalExpedientes,
    );
  }
  abrirDocumentosExpediente(row: ConsultaExpedienteRow): void {
    this.selectedExpedienteDocs = row;
    this.documentosExpedienteOpen = true;
    this.documentosExpedienteLoading = true;
    this.documentosExpedienteError = '';
    this.documentosExpedienteRows = [];

    this.api.getDocumentosAccesoExpediente(row.id).subscribe({
      next: (rows: ConsultaDocumentoRow[]) => {
        this.documentosExpedienteRows = (rows ?? []).map((doc) => ({
          ...doc,
          canView: true,
          canPreview: true,
          canDownload: true,
        }));
        this.documentosExpedienteLoading = false;
      },
      error: (e: any) => {
        this.documentosExpedienteLoading = false;
        this.documentosExpedienteError =
          e?.error?.message || 'No se pudieron cargar los documentos del expediente.';
      },
    });
  }

  cerrarDocumentosExpediente(): void {
    this.documentosExpedienteOpen = false;
    this.documentosExpedienteLoading = false;
    this.documentosExpedienteError = '';
    this.documentosExpedienteRows = [];
    this.selectedExpedienteDocs = null;
  }

  verDesdeExpediente(row: ConsultaDocumentoRow): void {
    this.cerrarDocumentosExpediente();
    this.ver(row);
  }

  descargarDesdeExpediente(row: ConsultaDocumentoRow): void {
    this.descargar(row);
  }
}
