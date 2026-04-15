import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';

interface IndiceRow {
  id: number;
  hash: string;
  fecha: string;
  firma_id?: number | null;
  expediente_id: number;
  expediente_codigo?: string;
  expediente_nombre?: string;
  expediente_estado?: string;
  json_path?: string | null;
  acta_pdf_path?: string | null;
}

@Component({
  selector: 'app-archivista-indices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './archivista-indices.component.html',
  styleUrls: ['./archivista-indices.component.css'],
})
export class ArchivistaIndicesComponent implements OnInit, OnDestroy {
  private readonly apiBase = (environment.apiUrl || environment.api || '').replace(/\/$/, '');

  indices: IndiceRow[] = [];
  filteredIndices: IndiceRow[] = [];
  pagedIndices: IndiceRow[] = [];
  indicesPage = 1;
  indicesPageSize = 5;

  filtroId = '';
  filtroExpediente = '';
  filtroCodigo = '';
  filtroHash = '';
  filtroFechaDesde = '';
  filtroFechaHasta = '';
  loadingIndices = false;
  errorIndices = '';

  toastVisible = false;
  toastMessage = '';
  toastKind: 'success' | 'error' = 'success';
  private toastClearId: ReturnType<typeof setTimeout> | null = null;

  /** ej. "json:12" | "pdf:12" — descarga/stream en curso por id de índice. */
  cargaArchivoKey: string | null = null;
  private revokeTimers: ReturnType<typeof setTimeout>[] = [];

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnDestroy(): void {
    if (this.toastClearId) {
      clearTimeout(this.toastClearId);
      this.toastClearId = null;
    }
    for (const t of this.revokeTimers) {
      clearTimeout(t);
    }
    this.revokeTimers = [];
  }

  ngOnInit(): void {
    this.cargarIndices();
  }

  cargarIndices(): void {
    this.loadingIndices = true;
    this.errorIndices = '';

    this.http.get<IndiceRow[]>(`${this.apiBase}/indices`).subscribe({
      next: (response) => {
        this.indices = response ?? [];
        this.aplicarFiltroIndices();
        this.loadingIndices = false;
      },
      error: (error) => {
        this.errorIndices = 'No se pudieron cargar los índices electrónicos.';
        this.loadingIndices = false;
        console.error('Error al obtener índices:', error);
      },
    });
  }

  aplicarFiltroIndices(): void {
    const idQ = this.filtroId.trim();
    const expedienteQ = this.filtroExpediente.trim().toLowerCase();
    const codigoQ = this.filtroCodigo.trim().toLowerCase();
    const hashQ = this.filtroHash.trim().toLowerCase();

    this.filteredIndices = this.indices.filter((i) => {
      const matchId =
        !idQ || (/^\d+$/.test(idQ) && i.id === Number(idQ));

      const matchExpediente =
        !expedienteQ ||
        String(i.expediente_nombre ?? '').toLowerCase().includes(expedienteQ);

      const matchCodigo =
        !codigoQ ||
        String(i.expediente_codigo ?? '').toLowerCase().includes(codigoQ);

      const matchHash =
        !hashQ ||
        String(i.hash ?? '').toLowerCase().includes(hashQ);

      const fecha = i.fecha ? new Date(i.fecha) : null;

      const matchFechaDesde =
        !this.filtroFechaDesde || !fecha
          ? true
          : fecha >= new Date(`${this.filtroFechaDesde}T00:00:00`);

      const matchFechaHasta =
        !this.filtroFechaHasta || !fecha
          ? true
          : fecha <= new Date(`${this.filtroFechaHasta}T23:59:59`);

      return (
        matchId &&
        matchExpediente &&
        matchCodigo &&
        matchHash &&
        matchFechaDesde &&
        matchFechaHasta
      );
    });
    this.indicesPage = 1;
    this.repaginarIndices();
  }
  limpiarFiltros(): void {
    this.filtroId = '';
    this.filtroExpediente = '';
    this.filtroCodigo = '';
    this.filtroHash = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.indicesPage = 1;
    this.aplicarFiltroIndices();
  }

  formatDate(value?: string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-CR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  shortHash(hash?: string | null): string {
    if (!hash) return '—';
    if (hash.length <= 18) return hash;
    return `${hash.slice(0, 12)}...${hash.slice(-6)}`;
  }

  /**
   * Descarga JSON vía API autenticada (`GET /indices/archivo/:id/json`), no por URL estática /uploads.
   */
  descargarJson(indice: IndiceRow): void {
    if (!indice.json_path) return;

    const url = `${this.apiBase}/indices/archivo/${indice.id}/json`;
    const key = `json:${indice.id}`;
    this.cargaArchivoKey = key;
    this.http
      .get(url, { responseType: 'blob' })
      .pipe(finalize(() => (this.cargaArchivoKey = null)))
      .subscribe({
        next: (blob) => {
          const fileName =
            indice.json_path?.split('/').pop() || `indice-${indice.id}.json`;
          this.triggerBlobDownload(blob, fileName);
          this.showToast('Descarga iniciada.', 'success');
        },
        error: (err) => {
          this.showBlobHttpErrorToast(err, this.msgDescargaError.bind(this));
        },
      });
  }

  /**
   * Abre el PDF vía API (`GET /indices/archivo/:id/pdf`) + blob; JWT por interceptor.
   */
  verPdf(indice: IndiceRow): void {
    if (!indice.acta_pdf_path) return;

    const preview = window.open('', '_blank');
    if (!preview) {
      this.showToast(
        'El navegador bloqueó la ventana emergente. Permita ventanas para este sitio e intente de nuevo.',
        'error',
      );
      return;
    }

    const url = `${this.apiBase}/indices/archivo/${indice.id}/pdf`;
    const key = `pdf:${indice.id}`;
    this.cargaArchivoKey = key;
    this.http
      .get(url, { responseType: 'blob' })
      .pipe(finalize(() => (this.cargaArchivoKey = null)))
      .subscribe({
        next: (blob) => {
          if (this.blobLooksLikeJsonError(blob)) {
            preview.close();
            this.showToast(
              'El servidor devolvió un error en lugar del PDF. Compruebe que el archivo exista en el servidor.',
              'error',
            );
            return;
          }
          const objectUrl = URL.createObjectURL(blob);
          preview.location.href = objectUrl;
          const t = setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
            this.revokeTimers = this.revokeTimers.filter((x) => x !== t);
          }, 120_000);
          this.revokeTimers.push(t);
          this.showToast('Abriendo PDF en una nueva pestaña.', 'success');
        },
        error: (err) => {
          try {
            preview.close();
          } catch {
            /* noop */
          }
          this.showBlobHttpErrorToast(err, this.msgPdfError.bind(this));
        },
      });
  }

  archivoLoading(indice: IndiceRow, kind: 'json' | 'pdf'): boolean {
    return this.cargaArchivoKey === `${kind}:${indice.id}`;
  }

  /** Si el servidor respondió JSON (p. ej. error) en cuerpo 200 con tipo application/json */
  private blobLooksLikeJsonError(blob: Blob): boolean {
    const t = (blob.type || '').toLowerCase();
    return t.includes('json');
  }

  private msgPdfError(err: unknown): string {
    return this.formatHttpBlobError(err, 'No se pudo abrir el PDF');
  }

  private msgDescargaError(err: unknown): string {
    return this.formatHttpBlobError(err, 'No se pudo descargar el archivo');
  }

  /**
   * Con `responseType: 'blob'`, los errores JSON del API llegan como Blob en `error.error`.
   * Intentamos leer `message` del JSON para mostrar el motivo real (p. ej. archivo inexistente).
   */
  private showBlobHttpErrorToast(
    err: unknown,
    fallback: (e: unknown) => string,
  ): void {
    if (err instanceof HttpErrorResponse && err.error instanceof Blob) {
      err.error
        .text()
        .then((text) => {
          try {
            const j = JSON.parse(text) as { message?: string };
            if (j?.message && typeof j.message === 'string') {
              this.showToast(j.message, 'error');
              return;
            }
          } catch {
            /* noop */
          }
          this.showToast(fallback(err), 'error');
        })
        .catch(() => this.showToast(fallback(err), 'error'));
      return;
    }
    this.showToast(fallback(err), 'error');
  }

  private formatHttpBlobError(err: unknown, base: string): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401 || err.status === 403) {
        return `${base}: sesión o permisos (${err.status}). Vuelva a iniciar sesión.`;
      }
      if (err.status === 404) {
        return `${base}: el archivo no está en el servidor (404).`;
      }
      if (err.status === 0) {
        return `${base}: no hay conexión con el API o CORS bloqueó la petición.`;
      }
      return `${base} (código ${err.status}).`;
    }
    return base + '.';
  }

  private triggerBlobDownload(blob: Blob, fileName: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    const t = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      this.revokeTimers = this.revokeTimers.filter((x) => x !== t);
    }, 30_000);
    this.revokeTimers.push(t);
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
    }, 3800);
  }

  get totalIndicesPages(): number {
    return Math.max(1, Math.ceil(this.filteredIndices.length / this.indicesPageSize));
  }

  get indicesRangeStart(): number {
    if (this.filteredIndices.length === 0) return 0;
    return (this.indicesPage - 1) * this.indicesPageSize + 1;
  }

  get indicesRangeEnd(): number {
    return Math.min(this.indicesPage * this.indicesPageSize, this.filteredIndices.length);
  }

  private repaginarIndices(): void {
    if (this.indicesPage > this.totalIndicesPages) {
      this.indicesPage = this.totalIndicesPages;
    }

    const start = (this.indicesPage - 1) * this.indicesPageSize;
    this.pagedIndices = this.filteredIndices.slice(start, start + this.indicesPageSize);
  }

  prevIndicesPage(): void {
    if (this.indicesPage > 1) {
      this.indicesPage--;
      this.repaginarIndices();
    }
  }

  nextIndicesPage(): void {
    if (this.indicesPage < this.totalIndicesPages) {
      this.indicesPage++;
      this.repaginarIndices();
    }
  }

  volverClasificacion(): void {
    this.router.navigate(['/archivista/clasificacion']);
  }
}
