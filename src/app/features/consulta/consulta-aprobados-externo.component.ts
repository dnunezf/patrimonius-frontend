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
import {
  ConsultaAprobadosApiService,
  ConsultaDocumentoRow,
  ConsultaFiltrosOpciones,
} from '../../../core/services/consulta-aprobados-api.service';
import { onConsultaPreviewLinkClick } from './consulta-preview-link.util';


@Component({
  selector: 'app-consulta-aprobados-externo',
  standalone: true,
  imports: [CommonModule, FormsModule, SolicitudAccesoDialogComponent],
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

  previewOpen = false;
  previewTitle = '';
  previewHtml: SafeHtml | null = null;
  previewLoading = false;
  previewMode: 'pdf' | 'html' | null = null;
  pdfPreviewTruncated = false;
  private previewDocumentoId: number | null = null;

  solicitudOpen = false;
  selectedDocumento: ConsultaDocumentoRow | null = null;

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

    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';

    this.api
      .searchExterno({
        q: this.q.trim() || undefined,
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
        },
        error: (e) => {
          this.loading = false;
          this.errorMsg =
            e?.error?.message || 'Error al consultar documentos disponibles.';
        },
      });
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.load();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.load();
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
    } catch {
      /* localStorage no disponible */
    }

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
      } catch {
        /* ignore */
      }
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
      } catch {
        /* mantener mensaje por defecto */
      }
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
}
