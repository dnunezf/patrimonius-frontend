import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpResponse } from '@angular/common/http';
import { AuditService, AuditItem, AuditDetail } from '../../../../core/services/audit.service';
import { AdminUsersService } from '../../../../core/services/admin-users.service';
import { DocumentCycleDetailModalComponent } from './document-cycle-detail-modal/document-cycle-detail-modal.component';
import { BITACORA_FILTER_TYPING_DEBOUNCE_MS } from '../bitacora-list-filter.util';
import { ToastService } from '../../../shared/ui/toast.service';

type ResultType = 'Permitido' | 'Denegado';

@Component({
  selector: 'app-document-cycle-log',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DocumentCycleDetailModalComponent],
  templateUrl: './document-cycle-log.component.html',
  styleUrls: ['./document-cycle-log.component.css'],
})
export class DocumentCycleLogComponent implements OnInit, OnDestroy {

  // Backend-fed combos
  users: string[] = ['Todos los usuarios'];

  results: Array<'Todos los resultados' | ResultType> = [
    'Todos los resultados', 'Permitido', 'Denegado'
  ];

  // Filters
  filters = {
    q: '',
    user: 'Todos los usuarios',
    state: '', // valor backend (vacío = todos)
    result: 'Todos los resultados',
    document: ''
  };

  /** Opciones de estado: valor para el backend y etiqueta para mostrar */
  stateOptions: { value: string; label: string }[] = [];

  loading = false;
  error: string | null = null;
  page = 1;
  pageSize = 10;
  sortBy = 'fecha_hora';
  sortDir: 'asc' | 'desc' = 'desc';
  events: AuditItem[] = [];
  totalItems = 0;
  totalPages = 1;

  detailOpen = false;
  detailLoading = false;
  detailError: string | null = null;
  detail: AuditDetail | null = null;

  private filterApplyTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly toast = inject(ToastService);

  constructor(
    private audit: AuditService,
    private adminUsers: AdminUsersService
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.loadStates();
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

  /** Filtros desplegables / fechas: aplicar al instante. Texto: usar `scheduleFilterApplyDebounced`. */
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

  // Build query params for backend
  private buildQuery() {
    const qp: any = {
      page: this.page,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortDir: this.sortDir
    };
    if (this.filters.q?.trim()) qp.q = this.toUpperValue(this.filters.q).trim();
    if (this.filters.user !== 'Todos los usuarios') qp.usuario = this.filters.user;
    const dbResult = this.mapUiResultToDbResult(this.filters.result);
    if (dbResult) qp.resultado = dbResult;

    if (this.filters.document?.trim()) qp.documento = this.toUpperValue(this.filters.document).trim();

    if (this.filters.state?.trim()) qp.estado = this.filters.state.trim();

    return qp;
  }

  /** Parámetros de exportación CSV/XML sin paginación. */
  private buildExportFilterParams(): Record<string, string> {
    const qp: Record<string, string> = {
      sortBy: this.sortBy,
      sortDir: this.sortDir,
    };
    if (this.filters.q?.trim()) qp['q'] = this.toUpperValue(this.filters.q).trim();
    if (this.filters.user !== 'Todos los usuarios') qp['usuario'] = this.filters.user;
    const dbResult = this.mapUiResultToDbResult(this.filters.result);
    if (dbResult) qp['resultado'] = dbResult;

    if (this.filters.document?.trim())
      qp['documento'] = this.toUpperValue(this.filters.document).trim();

    if (this.filters.state?.trim()) qp['estado'] = this.filters.state.trim();

    return qp;
  }

  // Fetch data with pagination
  fetch() {
    this.loading = true;
    this.error = null;
    const params = this.buildQuery();
    this.audit.listEvents(params).subscribe({
      next: (res) => {
        this.events = res.items;
        this.totalItems = res.totalItems;
        this.totalPages = res.totalPages;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar los eventos de auditoría';
        console.error(err);
        this.loading = false;
      }
    });
  }

  clearFilters() {
    this.clearFilterApplyDebounce();
    this.filters = {
      q: '',
      user: 'Todos los usuarios',
      state: '',
      result: 'Todos los resultados',
      document: ''
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

  export(format: 'csv' | 'xml') {
    this.error = null;
    const fallback =
      format === 'csv' ? 'eventos_auditoria.csv' : 'eventos_auditoria.xml';
    this.audit.exportEvents(format, this.buildExportFilterParams()).subscribe({
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

  resultClass(res: string | null | undefined) {
    const v = (res || '').trim().toLowerCase();

    if (v === 'permitida' || v === 'permitido') return 'badge badge-green';
    if (v === 'denegada'  || v === 'denegado')  return 'badge badge-red';

    return 'badge';
  }

  stateClass(state: string | null | undefined) {
    const stateClasses: Record<string, string> = {
      'firma': 'badge badge-green',
      'firma parcial': 'badge badge-partial',
      'firmado parcial': 'badge badge-partial',
      'archivado': 'badge badge-brown',
      'creacion': 'badge badge-yellow',
      'edicion': 'badge badge-orange',
      'eliminacion': 'badge badge-red',
      'transferencia': 'badge badge-purple'
    };

    const s = (state || '').trim().toLowerCase().replace(/_/g, ' ');
    return stateClasses[s] || 'badge';
  }

  readonly maxWords = 5;

  limitWords(value: string, field: 'q' | 'document'): void {
    const upperValue = this.toUpperValue(value);

    if (!upperValue) {
      if (field === 'q') this.filters.q = '';
      else this.filters.document = '';
      this.scheduleFilterApply(false);
      return;
    }

    const words = upperValue.trim().split(/\s+/);
    const limited =
      words.length > this.maxWords ? words.slice(0, this.maxWords).join(' ') : upperValue;

    if (field === 'q') this.filters.q = limited;
    else this.filters.document = limited;

    this.scheduleFilterApply(false);
  }

  private loadUsers() {
    this.adminUsers.listEmails().subscribe({
      next: (emails) => this.users = ['Todos los usuarios', ...emails],
      error: () => this.users = ['Todos los usuarios']
    });
  }

  // Fetch the states from backend; guardamos valor crudo para el filtro y etiqueta para mostrar
  private loadStates() {
    this.audit.getDocumentStates().subscribe({
      next: (dbStates) => {
        this.stateOptions = [
          { value: '', label: 'Todos los estados' },
          ...(dbStates || []).map((raw) => ({ value: raw, label: this.formatToDisplay(raw) }))
        ];
      },
      error: () => {
        this.stateOptions = [{ value: '', label: 'Todos los estados' }];
      }
    });
  }

  private formatToDisplay(value: string): string {
    return value
      .toLowerCase()  // LOWERCASE
      .replace(/_/g, ' ')  // replace underscores with spaces
      .replace(/\b\w/g, (char) => char.toUpperCase());  // put first letter of each word to uppercase
  }

  private mapUiResultToDbResult(uiValue: string): string | null {
    const v = (uiValue || '').trim().toLowerCase();
    if (!v || v === 'todos los resultados') return null;
    if (v === 'permitido') return 'PERMITIDO';
    if (v === 'denegado') return 'DENEGADO';
    return null;
  }

  openDetail(row: AuditItem) {
    this.detailOpen = true;
    this.detail = null;
    this.detailError = null;
    this.detailLoading = true;
    this.audit.getEventDetail(row.id_evento).subscribe({
      next: (item) => {
        this.detail = item;
        this.detailLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.detailError =
          err?.error?.message || 'No se pudo cargar el detalle del evento.';
        this.detailLoading = false;
      }
    });
  }

  closeDetail() {
    this.detailOpen = false;
    this.detail = null;
  }

  documentName(e: AuditItem): string {
    const parts = [e.documento_codigo_unico, e.documento_codigo_oficial]
      .filter((v): v is string => !!v && v.trim().length > 0);
    return parts.join(' / ') || '—';
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return '—';
    const raw = String(value).trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::\d{2})?$/);
    if (!match) return raw;
    const [, yyyy, mm, dd, hh, min] = match;
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }

  private fullNameFromDetail(detail: AuditDetail): string {
    if (detail.usuario_nombre_completo?.trim()) return detail.usuario_nombre_completo.trim();
    return [detail.usuario_nombre, detail.usuario_apellido1, detail.usuario_apellido2]
      .filter((p) => !!p && String(p).trim().length > 0)
      .join(' ')
      .trim();
  }

}
