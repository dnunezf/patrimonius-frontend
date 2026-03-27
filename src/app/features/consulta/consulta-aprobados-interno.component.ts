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

  filtros: ConsultaFiltrosOpciones | null = null;
  rows: ConsultaDocumentoRow[] = [];
  totalItems = 0;
  totalPages = 1;
  page = 1;
  pageSize = 10;
  loading = false;
  errorMsg = '';

  q = '';
  categoriaId: string = '';
  unidadId: string = '';
  serieId: string = '';
  subserieId: string = '';
  expedienteId: string = '';
  dateFrom = '';
  dateTo = '';

  sortBy = 'fecha_aprobacion';
  sortDir: 'asc' | 'desc' = 'desc';

  previewOpen = false;
  previewTitle = '';
  previewHtml: SafeHtml | null = null;
  previewLoading = false;

  ngOnInit(): void {
    this.api.getFilterOptions().subscribe({
      next: (f) => (this.filtros = f),
      error: () => (this.errorMsg = 'No se pudieron cargar los filtros.'),
    });
    this.load();
  }

  get subseriesFiltradas() {
    const list = this.filtros?.subseries ?? [];
    const sid = Number(this.serieId);
    if (!Number.isFinite(sid) || sid <= 0) return list;
    return list.filter((s) => Number(s.serie_id) === sid);
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.api
      .search({
        q: this.q.trim() || undefined,
        page: this.page,
        pageSize: this.pageSize,
        sortBy: this.sortBy,
        sortDir: this.sortDir,
        categoriaId: this.categoriaId || undefined,
        unidadId: this.unidadId || undefined,
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
          this.loading = false;
        },
        error: (e) => {
          this.loading = false;
          this.errorMsg =
            e?.error?.message || 'Error al consultar documentos aprobados.';
        },
      });
  }

  onSort(col: string): void {
    if (this.sortBy === col) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = col;
      this.sortDir = 'desc';
    }
    this.page = 1;
    this.load();
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

  ver(row: ConsultaDocumentoRow): void {
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

  cerrarPreview(): void {
    this.previewOpen = false;
    this.previewHtml = null;
  }

  descargar(row: ConsultaDocumentoRow): void {
    if (!row.canDownload) return;
    this.api.download(row.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${row.codigo || 'documento'}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => alert('No se pudo descargar el documento.'),
    });
  }

  volver(): void {
    this.router.navigate(['/dashboard']);
  }
}
