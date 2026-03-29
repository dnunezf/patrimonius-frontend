import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  ConsultaDashboardApiService,
  ConsultaHistorialItem,
} from '../../../core/services/consulta-dashboard-api.service';

@Component({
  selector: 'app-consulta-historial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './consulta-historial.component.html',
  styleUrls: ['./consulta-historial.component.css'],
})
export class ConsultaHistorialComponent implements OnInit {
  private readonly api = inject(ConsultaDashboardApiService);
  private readonly router = inject(Router);

  loading = true;
  errorMsg = '';
  items: ConsultaHistorialItem[] = [];
  totalItems = 0;
  totalPages = 1;
  page = 1;
  pageSize = 20;

  descargasPorDocumento: {
    documento_id: number;
    codigo: string;
    titulo: string;
    veces: number;
    ultima_descarga: string;
  }[] = [];

  ngOnInit(): void {
    this.loadHistorial();
    this.api.getResumen().subscribe({
      next: (r) => {
        this.descargasPorDocumento = r.descargasPorDocumento ?? [];
      },
      error: () => {
        /* opcional */
      },
    });
  }

  loadHistorial(): void {
    this.loading = true;
    this.errorMsg = '';
    this.api.getHistorial({ page: this.page, pageSize: this.pageSize }).subscribe({
      next: (r) => {
        this.items = r.items;
        this.totalItems = r.totalItems;
        this.totalPages = r.totalPages;
        this.loading = false;
      },
      error: (e) => {
        this.errorMsg =
          e?.error?.message || 'No se pudo cargar el historial de consultas.';
        this.loading = false;
      },
    });
  }

  etiquetaAccion(accion: string | null | undefined): string {
    const a = String(accion || '');
    if (a.includes('BUSQUEDA')) return 'Búsqueda';
    if (a.includes('VISTA')) return 'Vista previa';
    if (a.includes('DESCARGA')) return 'Descarga';
    return a.replace(/^HU025_/, '') || '—';
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
    if (this.page > 1) {
      this.page--;
      this.loadHistorial();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadHistorial();
    }
  }

  volver(): void {
    this.router.navigate(['/usuario/dashboard']);
  }
}
