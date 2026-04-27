import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AuditService,
  UserActivityBitacoraDetail,
  UserActivityBitacoraItem,
} from '../../../../core/services/audit.service';
import { AdminUsersService } from '../../../../core/services/admin-users.service';
import { ActividadUsuarioDetailModalComponent } from './actividad-usuario-detail-modal/actividad-usuario-detail-modal.component';
import { BITACORA_FILTER_TYPING_DEBOUNCE_MS } from '../bitacora-list-filter.util';

@Component({
  selector: 'app-actividad-usuario-log',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ActividadUsuarioDetailModalComponent],
  templateUrl: './actividad-usuario-log.component.html',
  styleUrls: ['./actividad-usuario-log.component.css'],
})
export class ActividadUsuarioLogComponent implements OnInit, OnDestroy {
  users: string[] = ['Todos los usuarios'];
  actividades: string[] = ['Todas las actividades'];
  /** Recursos de consulta visibles en el filtro (sin solicitudes de acceso). */
  recursos: string[] = [
    'Todos los recursos',
    'CONSULTA_VISTA_PREVIA',
    'CONSULTA_DESCARGA',
    'CONSULTA_BUSQUEDA',
  ];
  results: string[] = ['Todos los resultados', 'PERMITIDO', 'DENEGADO'];

  filters = {
    q: '',
    user: 'Todos los usuarios',
    actividad: 'Todas las actividades',
    recurso: 'Todos los recursos',
    result: 'Todos los resultados',
    documento: '',
    from: '',
    to: '',
  };

  loading = false;
  error: string | null = null;
  page = 1;
  pageSize = 10;
  sortBy = 'fecha_hora';
  sortDir: 'asc' | 'desc' = 'desc';

  events: UserActivityBitacoraItem[] = [];
  totalPages = 1;
  totalItems = 0;

  detailOpen = false;
  detailLoading = false;
  detailError: string | null = null;
  detail: UserActivityBitacoraDetail | null = null;

  private filterApplyTimer: ReturnType<typeof setTimeout> | null = null;

  readonly maxWords = 5;

  constructor(
    private audit: AuditService,
    private adminUsers: AdminUsersService,
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.loadActividades();
    this.fetch();
  }

  ngOnDestroy(): void {
    this.clearFilterApplyDebounce();
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

  private buildQuery(): Parameters<AuditService['listUserActivityBitacoraEvents']>[0] {
    const qp: Parameters<AuditService['listUserActivityBitacoraEvents']>[0] = {
      page: this.page,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
    };
    if (this.filters.q?.trim()) qp.q = this.filters.q.trim();
    if (this.filters.user !== 'Todos los usuarios') qp.usuario = this.filters.user;
    if (this.filters.actividad !== 'Todas las actividades') qp.actividad = this.filters.actividad;
    if (this.filters.recurso !== 'Todos los recursos') qp.recurso = this.filters.recurso;
    if (this.filters.result !== 'Todos los resultados') qp.resultado = this.filters.result;
    if (this.filters.documento?.trim()) qp.documento = this.filters.documento.trim();
    if (this.filters.from?.trim()) qp.from = this.filters.from.trim();
    if (this.filters.to?.trim()) qp.to = this.filters.to.trim();
    return qp;
  }

  fetch() {
    this.loading = true;
    this.error = null;
    this.audit.listUserActivityBitacoraEvents(this.buildQuery()).subscribe({
      next: (res) => {
        this.events = res.items;
        this.totalItems = res.totalItems;
        this.totalPages = res.totalPages;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Error al cargar la bitácora de actividad de usuario';
        this.loading = false;
      },
    });
  }

  limitSearchWords(value: string): void {
    if (!value) {
      this.filters.q = '';
      this.scheduleFilterApply(false);
      return;
    }
    const words = value.trim().split(/\s+/);
    this.filters.q =
      words.length > this.maxWords ? words.slice(0, this.maxWords).join(' ') : value;
    this.scheduleFilterApply(false);
  }

  limitDocumentWords(value: string): void {
    if (!value) {
      this.filters.documento = '';
      this.scheduleFilterApply(false);
      return;
    }
    const words = value.trim().split(/\s+/);
    this.filters.documento =
      words.length > this.maxWords ? words.slice(0, this.maxWords).join(' ') : value;
    this.scheduleFilterApply(false);
  }

  clearFilters() {
    this.clearFilterApplyDebounce();
    this.filters = {
      q: '',
      user: 'Todos los usuarios',
      actividad: 'Todas las actividades',
      recurso: 'Todos los recursos',
      result: 'Todos los resultados',
      documento: '',
      from: '',
      to: '',
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
      next: (emails) => (this.users = ['Todos los usuarios', ...emails]),
      error: () => (this.users = ['Todos los usuarios']),
    });
  }

  private loadActividades() {
    this.audit.getUserActivityBitacoraActividades().subscribe({
      next: (items) => (this.actividades = ['Todas las actividades', ...items]),
      error: () => (this.actividades = ['Todas las actividades']),
    });
  }

  downloadCSV() {
    const rows = this.events || [];
    const headers = [
      'fecha_hora',
      'usuario',
      'accion',
      'resultado',
      'actividad',
      'recurso',
      'documento_titulo',
      'documento_codigo_unico',
    ];
    const escape = (val: unknown) => {
      const s = String(val ?? '');
      const mustQuote = /[",\n]/.test(s);
      const safe = s.replace(/"/g, '""');
      return mustQuote ? `"${safe}"` : safe;
    };
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    this.triggerDownload(blob, `bitacora_actividad_usuario_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  downloadXML() {
    const rows = this.events || [];
    const escXml = (s: unknown) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bitacoraActividadUsuario>
${rows
  .map(
    (r) => `
  <evento>
    <fecha_hora>${escXml(r.fecha_hora)}</fecha_hora>
    <usuario>${escXml(r.usuario)}</usuario>
    <accion>${escXml(r.accion)}</accion>
    <resultado>${escXml(r.resultado)}</resultado>
    <actividad>${escXml(r.actividad)}</actividad>
    <recurso>${escXml(r.recurso)}</recurso>
    <documento_titulo>${escXml(r.documento_titulo)}</documento_titulo>
    <documento_codigo_unico>${escXml(r.documento_codigo_unico)}</documento_codigo_unico>
  </evento>`,
  )
  .join('')}
</bitacoraActividadUsuario>
`.trim();
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    this.triggerDownload(blob, `bitacora_actividad_usuario_${new Date().toISOString().slice(0, 10)}.xml`);
  }

  private triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  openDetail(row: UserActivityBitacoraItem) {
    this.detailOpen = true;
    this.detail = null;
    this.detailError = null;
    this.detailLoading = true;
    this.audit.getUserActivityBitacoraDetail(row.id_evento).subscribe({
      next: (item) => {
        this.detail = item;
        this.detailLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.detailError = err?.error?.message || 'No se pudo cargar el detalle del evento.';
        this.detailLoading = false;
      },
    });
  }

  closeDetail() {
    this.detailOpen = false;
    this.detail = null;
    this.detailError = null;
  }
}
