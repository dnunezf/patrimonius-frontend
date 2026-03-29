import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  ConsultaAprobadosApiService,
  ConsultaDocumentoRow,
  ConsultaFiltrosOpciones,
} from '../../../core/services/consulta-aprobados-api.service';

@Component({
  selector: 'app-consulta-aprobados-interno',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consulta-aprobados-interno.component.html',
  styleUrls: ['./consulta-aprobados-interno.component.css'],
})
export class ConsultaAprobadosInternoComponent implements OnInit {
  private readonly api = inject(ConsultaAprobadosApiService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  /** Visibles en plantilla (strictTemplates / strictInputAccessModifiers). */
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

  public downloadErrorOpen = false;
  public downloadErrorTitle = 'No se pudo descargar';
  public downloadErrorMessage = '';

  /** Unidad con la que filtra el API (solo aplica a internos que no son administrador). */
  public filtroUnidadUsuario: number | null = null;
  public aplicaFiltroUnidad = false;

  public ngOnInit(): void {
    this.api.getFilterOptions().subscribe({
      next: (f) => (this.filtros = f),
      error: () => (this.errorMsg = 'No se pudieron cargar los filtros.'),
    });
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
        },
        error: (e) => {
          this.loading = false;
          this.errorMsg =
            e?.error?.message || 'Error al consultar documentos aprobados.';
        },
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
    this.previewOpen = true;
    this.previewLoading = true;
    this.previewTitle = row.titulo;
    this.previewHtml = null;
    this.api.getPreview(row.id).subscribe({
      next: (p) => {
        this.previewTitle = p.titulo || this.previewTitle;
        const html = String(p.contenido || '').trim();
        this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(html);
        this.previewLoading = false;
      },
      error: () => {
        this.previewLoading = false;
        this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(
          '<p>No se pudo cargar la vista previa.</p>',
        );
      },
    });
  }

  public cerrarPreview(): void {
    this.previewOpen = false;
    this.previewHtml = null;
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

  /** Primer índice mostrado en la página actual (1-based). */
  public get rangeStart(): number {
    if (this.totalItems === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  /** Último índice mostrado en la página actual. */
  public get rangeEnd(): number {
    if (this.totalItems === 0) return 0;
    return Math.min(this.page * this.pageSize, this.totalItems);
  }
}
