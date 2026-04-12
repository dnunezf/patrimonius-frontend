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

  public q = '';
  public categoriaId: string = '';
  public serieId: string = '';
  public subserieId: string = '';
  public expedienteId: string = '';
  public dateFrom = '';
  public dateTo = '';

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

  public load(): void {
    this.loading = true;
    this.errorMsg = '';

    this.api
      .searchInterno({
        q: this.q.trim() || undefined,
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

    this.q = item.texto_busqueda || '';
    this.categoriaId = filtros['categoriaId'] ? String(filtros['categoriaId']) : '';
    this.serieId = filtros['serieId'] ? String(filtros['serieId']) : '';
    this.subserieId = filtros['subserieId'] ? String(filtros['subserieId']) : '';
    this.expedienteId = filtros['expedienteId'] ? String(filtros['expedienteId']) : '';
    this.dateFrom = filtros['dateFrom'] || '';
    this.dateTo = filtros['dateTo'] || '';

    if (filtros['sortBy']) {
      this.sortBy = String(filtros['sortBy']);
    }
    if (filtros['sortDir'] === 'asc' || filtros['sortDir'] === 'desc') {
      this.sortDir = filtros['sortDir'];
    }

    this.page = 1;
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
    if (this.page > 1) {
      this.page--;
      this.load();
    }
  }

  public nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.load();
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

  public seleccionarSugerenciaHistorial(item: HistorialBusquedaRow): void {
    this.usarBusquedaHistorial(item);
    this.mostrarSugerenciasHistorial = false;
  }
}
