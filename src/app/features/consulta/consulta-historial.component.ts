import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  ConsultaDashboardApiService,
  ConsultaHistorialItem,
} from '../../../core/services/consulta-dashboard-api.service';
import { ConsultaPanelPrefsService } from '../../../core/services/consulta-panel-prefs.service';
import { AuthService } from '../../../core/services/auth.service';

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
  private readonly prefs = inject(ConsultaPanelPrefsService);
  private readonly auth = inject(AuthService);

  usuarioId = 0;
  loading = true;
  loadingDescargas = false;
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
  descargasPage = 1;
  descargasPageSize = 15;
  descargasTotal = 0;
  descargasTotalPages = 1;

  ngOnInit(): void {
    const u = this.auth.currentUser?.();
    this.usuarioId = u?.id ?? 0;
    this.loadAll();
  }

  loadAll(): void {
    this.loadDescargas();
    this.loadHistorial();
  }

  loadDescargas(): void {
    if (!this.usuarioId) {
      this.loadingDescargas = false;
      return;
    }
    this.loadingDescargas = true;
    const desde = this.prefs.getDescargasDesde(this.usuarioId);
    this.api
      .getResumen({
        descargasPage: this.descargasPage,
        descargasPageSize: this.descargasPageSize,
        descargasDesde: desde || undefined,
      })
      .subscribe({
        next: (r) => {
          this.descargasPorDocumento = r.descargasPorDocumento ?? [];
          this.descargasTotal = r.descargasTotal ?? this.descargasPorDocumento.length;
          this.descargasTotalPages = r.descargasTotalPages ?? 1;
          this.loadingDescargas = false;
        },
        error: () => {
          this.loadingDescargas = false;
        },
      });
  }

  loadHistorial(): void {
    this.loading = true;
    this.errorMsg = '';
    const desde =
      this.usuarioId > 0 ? this.prefs.getHistorialDesde(this.usuarioId) : null;
    this.api
      .getHistorial({
        page: this.page,
        pageSize: this.pageSize,
        desde: desde || undefined,
      })
      .subscribe({
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

  limpiarHistorialDetallado(): void {
    if (!this.usuarioId) return;
    this.prefs.clearHistorial(this.usuarioId);
    this.page = 1;
    this.loadHistorial();
  }

  limpiarDescargasPorDocumento(): void {
    if (!this.usuarioId) return;
    this.prefs.clearDescargas(this.usuarioId);
    this.descargasPage = 1;
    this.loadDescargas();
  }

  restaurarVistas(): void {
    if (!this.usuarioId) return;
    this.prefs.resetHistorial(this.usuarioId);
    this.prefs.resetDescargas(this.usuarioId);
    this.page = 1;
    this.descargasPage = 1;
    this.loadAll();
  }

  prevDescargas(): void {
    if (this.descargasPage > 1) {
      this.descargasPage--;
      this.loadDescargas();
    }
  }

  nextDescargas(): void {
    if (this.descargasPage < this.descargasTotalPages) {
      this.descargasPage++;
      this.loadDescargas();
    }
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
