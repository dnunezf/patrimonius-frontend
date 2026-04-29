import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuditService, AuditItem, AuditDetail } from '../../../../core/services/audit.service';
import { AdminUsersService } from '../../../../core/services/admin-users.service';
import { DocumentCycleDetailModalComponent } from './document-cycle-detail-modal/document-cycle-detail-modal.component';
import { catchError, forkJoin, of } from 'rxjs';
import { BITACORA_FILTER_TYPING_DEBOUNCE_MS } from '../bitacora-list-filter.util';

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
        this.error = 'Error cargando eventos de auditoría';
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

  // Export with current filters using detail payload per event.
  export(format: 'csv' | 'xml') {
    const params = { ...this.buildQuery(), page: 1, pageSize: 10000 };
    this.error = null;
    this.audit.listEvents(params).subscribe({
      next: (res) => {
        const rows = res.items || [];
        const detailRequests = rows.map((r) =>
          this.audit.getEventDetail(r.id_evento).pipe(catchError(() => of(null)))
        );
        forkJoin(detailRequests).subscribe({
          next: (details) => {
            const validDetails = details.filter((d): d is AuditDetail => !!d);
            const filename = format === 'csv' ? 'eventos_auditoria.csv' : 'eventos_auditoria.xml';
            const blob = format === 'csv' ? this.buildCsvBlob(validDetails) : this.buildXmlBlob(validDetails);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          },
          error: (err) => {
            this.error = 'Error al exportar.';
            console.error(err);
          }
        });
      },
      error: (err) => {
        this.error = 'Error al exportar.';
        console.error(err);
      }
    });
  }

  private buildCsvBlob(rows: AuditDetail[]): Blob {
    const escape = (val: unknown) => {
      const s = String(val ?? '');
      const mustQuote = /[",\n]/.test(s);
      return mustQuote ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = [
      'ID evento',
      'Fecha del evento',
      'Título actual',
      'Título (snapshot)',
      'Nombre actual',
      'Nombre (snapshot)',
      'Estado actual',
      'Estado (snapshot)',
      'Correo usuario',
      'Nombre completo',
      'Acción',
      'Evento ciclo',
      'Acción solicitada',
      'Resultado',
      'Motivo'
    ];
    const line = (e: AuditDetail) => [
      e.id_evento,
      e.fecha_evento ?? '',
      e.documento_titulo_actual ?? '',
      e.documento_titulo ?? '',
      e.documento_nombre_actual ?? '',
      e.documento_nombre ?? e.documento_codigo ?? '',
      e.documento_estado_actual ?? '',
      e.documento_estado ?? '',
      e.usuario_email ?? '',
      this.fullNameFromDetail(e),
      e.accion ?? '',
      e.evento_ciclo ?? '',
      e.accion_solicitada ?? '',
      e.resultado ?? '',
      e.motivo ?? ''
    ].map(escape).join(',');
    const csv = [headers.join(','), ...rows.map(line)].join('\n');
    return new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  }

  private buildXmlBlob(rows: AuditDetail[]): Blob {
    const esc = (s: unknown) => String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<eventos_auditoria>
${rows.map(e => `  <evento>
    <id_evento>${esc(e.id_evento)}</id_evento>
    <fecha_hora>${esc(e.fecha_evento)}</fecha_hora>
    <titulo_actual>${esc(e.documento_titulo_actual)}</titulo_actual>
    <titulo_snapshot>${esc(e.documento_titulo)}</titulo_snapshot>
    <nombre_actual>${esc(e.documento_nombre_actual)}</nombre_actual>
    <nombre_snapshot>${esc(e.documento_nombre ?? e.documento_codigo)}</nombre_snapshot>
    <estado_documento_actual>${esc(e.documento_estado_actual)}</estado_documento_actual>
    <estado_documento_snapshot>${esc(e.documento_estado)}</estado_documento_snapshot>
    <usuario>${esc(e.usuario_email)}</usuario>
    <usuario_nombre_completo>${esc(this.fullNameFromDetail(e))}</usuario_nombre_completo>
    <accion>${esc(e.accion)}</accion>
    <evento_ciclo>${esc(e.evento_ciclo)}</evento_ciclo>
    <accion_solicitada>${esc(e.accion_solicitada)}</accion_solicitada>
    <resultado>${esc(e.resultado)}</resultado>
    <motivo>${esc(e.motivo)}</motivo>
  </evento>`).join('\n')}
</eventos_auditoria>`;
    return new Blob([xml], { type: 'application/xml;charset=utf-8' });
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
