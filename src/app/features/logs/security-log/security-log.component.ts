import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpResponse } from '@angular/common/http';
import { AuditService, SecurityDetail, SecurityItem } from '../../../../core/services/audit.service';
import { AdminUsersService } from '../../../../core/services/admin-users.service';
import { SecurityDetailModalComponent } from './security-detail-modal/security-detail-modal.component';
import { BITACORA_FILTER_TYPING_DEBOUNCE_MS } from '../bitacora-list-filter.util';
import { ToastService } from '../../../shared/ui/toast.service';

@Component({
  selector: 'app-security-log',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SecurityDetailModalComponent],
  templateUrl: './security-log.component.html',
  styleUrls: ['./security-log.component.css'],
})
export class SecurityLogComponent implements OnInit, OnDestroy {
  users: string[] = ['Todos los usuarios'];
  actions: string[] = ['Todas las acciones'];

  results: string[] = ['Todos los resultados', 'PERMITIDO', 'DENEGADO'];

  filters = {
    q: '',
    user: 'Todos los usuarios',
    accion: 'Todas las acciones',
    result: 'Todos los resultados',
  };

  loading = false;
  error: string | null = null;

  page = 1;
  pageSize = 10;
  sortBy = 'fecha_hora';
  sortDir: 'asc' | 'desc' = 'desc';

  events: SecurityItem[] = [];
  totalPages = 1;
  totalItems = 0;
  detailOpen = false;
  detailLoading = false;
  detailError: string | null = null;
  detail: SecurityDetail | null = null;

  private filterApplyTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly toast = inject(ToastService);

  constructor(private audit: AuditService, private adminUsers: AdminUsersService) {}

  ngOnInit() {
    this.loadUsers();
    this.loadActions();
    this.fetch();
  }

  ngOnDestroy(): void {
    this.clearFilterApplyDebounce();
  }

  private toUpperValue(value: string | null | undefined): string {
    return String(value || '').toUpperCase();
  }

  private clearFilterApplyDebounce(): void {
    if (this.filterApplyTimer) {
      clearTimeout(this.filterApplyTimer);
      this.filterApplyTimer = null;
    }
  }

  scheduleFilterApply(immediate: boolean): void {
    this.clearFilterApplyDebounce();
    const run = () => {
      this.filterApplyTimer = null;
      this.page = 1;
      this.fetch();
    };
    if (immediate) {
      run();
    } else {
      this.filterApplyTimer = setTimeout(run, BITACORA_FILTER_TYPING_DEBOUNCE_MS);
    }
  }

  private buildQuery() {
    const qp: any = {
      page: this.page,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
    };

    if (this.filters.q?.trim()) qp.q = this.toUpperValue(this.filters.q).trim();
    if (this.filters.user !== 'Todos los usuarios') qp.usuario = this.filters.user;

    if (this.filters.accion !== 'Todas las acciones') qp.accion = this.filters.accion;

    if (this.filters.result !== 'Todos los resultados') qp.resultado = this.filters.result;

    return qp;
  }

  private buildExportFilterParams(): Record<string, string> {
    const qp: Record<string, string> = {
      sortBy: this.sortBy,
      sortDir: this.sortDir,
    };
    if (this.filters.q?.trim()) qp['q'] = this.toUpperValue(this.filters.q).trim();
    if (this.filters.user !== 'Todos los usuarios') qp['usuario'] = this.filters.user;
    if (this.filters.accion !== 'Todas las acciones') qp['accion'] = this.filters.accion;
    if (this.filters.result !== 'Todos los resultados') qp['resultado'] = this.filters.result;

    return qp;
  }

  fetch() {
    this.loading = true;
    this.error = null;

    this.audit.listSecurityEvents(this.buildQuery()).subscribe({
      next: (res) => {
        this.events = res.items;
        this.totalItems = res.totalItems;
        this.totalPages = res.totalPages;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Error al cargar los eventos de seguridad';
        this.loading = false;
      }
    });
  }

  readonly maxWords = 5;

  limitSearchWords(value: string): void {
    const upperValue = this.toUpperValue(value);

    if (!upperValue) {
      this.filters.q = '';
      this.scheduleFilterApply(false);
      return;
    }

    const words = upperValue.trim().split(/\s+/);
    this.filters.q = words.length > this.maxWords ? words.slice(0, this.maxWords).join(' ') : upperValue;
    this.scheduleFilterApply(false);
  }

  clearFilters() {
    this.clearFilterApplyDebounce();
    this.filters = {
      q: '',
      user: 'Todos los usuarios',
      accion: 'Todas las acciones',
      result: 'Todos los resultados',
    };
    this.page = 1;
    this.fetch();
  }

  goPrev() {
    this.clearFilterApplyDebounce();
    if (this.page > 1) {
      this.page--;
      this.fetch();
    }
  }

  goNext() {
    this.clearFilterApplyDebounce();
    if (this.page < this.totalPages) {
      this.page++;
      this.fetch();
    }
  }

  private loadUsers() {
    this.adminUsers.listEmails().subscribe({
      next: (emails) => this.users = ['Todos los usuarios', ...emails],
      error: () => this.users = ['Todos los usuarios']
    });
  }

  private loadActions() {
    this.audit.getSecurityActions().subscribe({
      next: (items) => this.actions = ['Todas las acciones', ...items],
      error: () => this.actions = ['Todas las acciones'],
    });
  }

  downloadCSV() {
    this.downloadExport('csv');
  }

  downloadXML() {
    this.downloadExport('xml');
  }

  private downloadExport(format: 'csv' | 'xml'): void {
    this.error = null;
    const fallback =
      format === 'csv'
        ? `eventos_seguridad_${new Date().toISOString().slice(0, 10)}.csv`
        : `eventos_seguridad_${new Date().toISOString().slice(0, 10)}.xml`;
    this.audit.exportSecurityEvents(format, this.buildExportFilterParams()).subscribe({
      next: (resp) => {
        void this.finishBlobExport(resp, fallback);
      },
      error: (err) => {
        console.error(err);
        this.error = 'Error al exportar.';
      },
    });
  }

  private async finishBlobExport(
    resp: HttpResponse<Blob>,
    fallbackFilename: string,
  ): Promise<void> {
    const blob = resp.body;
    if (!blob || blob.size === 0) {
      this.error = 'No hay datos disponibles para exportar.';
      return;
    }

    const ct = (resp.headers.get('Content-Type') || '').toLowerCase();
    if (ct.includes('application/json')) {
      try {
        const text = await blob.text();
        const parsed = JSON.parse(text) as { message?: string };
        this.error = parsed.message || 'Error al exportar.';
      } catch {
        this.error = 'Error al exportar.';
      }
      return;
    }

    let filename = fallbackFilename;
    const cd = resp.headers.get('Content-Disposition');
    if (cd) {
      const match = /filename\*?=(?:UTF-8''|"?)([^";\r\n]+)/i.exec(cd);
      if (match?.[1]) {
        filename = decodeURIComponent(match[1].replace(/^"|"$/g, ''));
      }
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    this.toast.success('Exportación completada correctamente');
  }

  openDetail(row: SecurityItem) {
    this.detailOpen = true;
    this.detail = null;
    this.detailError = null;
    this.detailLoading = true;
    this.audit.getSecurityEventDetail(row.id_evento).subscribe({
      next: (item) => {
        this.detail = item;
        this.detailLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.detailError = err?.error?.message || 'No se pudo cargar el detalle del evento.';
        this.detailLoading = false;
      }
    });
  }

  closeDetail() {
    this.detailOpen = false;
    this.detail = null;
    this.detailError = null;
  }

}
