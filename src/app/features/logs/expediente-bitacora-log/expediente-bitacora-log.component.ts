import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  AuditService,
  ExpedienteBitacoraDetail,
  ExpedienteBitacoraItem,
} from '../../../../core/services/audit.service';
import { AdminUsersService } from '../../../../core/services/admin-users.service';
import { ExpedienteBitacoraDetailModalComponent } from './expediente-bitacora-detail-modal/expediente-bitacora-detail-modal.component';
import { BITACORA_FILTER_TYPING_DEBOUNCE_MS } from '../bitacora-list-filter.util';

@Component({
  selector: 'app-expediente-bitacora-log',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ExpedienteBitacoraDetailModalComponent,
  ],
  templateUrl: './expediente-bitacora-log.component.html',
  styleUrls: ['./expediente-bitacora-log.component.css'],
})
export class ExpedienteBitacoraLogComponent implements OnInit, OnDestroy {
  users: string[] = ['Todos los usuarios'];
  eventoOptions: string[] = [];
  resultadoOptions: string[] = [];

  filters = {
    q: '',
    user: 'Todos los usuarios',
    evento: '',
    resultado: '',
    expedienteId: '',
    from: '',
    to: '',
  };

  loading = false;
  error: string | null = null;

  page = 1;
  pageSize = 10;
  events: ExpedienteBitacoraItem[] = [];
  totalPages = 1;
  totalItems = 0;

  detailOpen = false;
  detailLoading = false;
  detailError: string | null = null;
  detail: ExpedienteBitacoraDetail | null = null;

  private filterApplyTimer: ReturnType<typeof setTimeout> | null = null;

  readonly maxWords = 5;

  constructor(
    private audit: AuditService,
    private adminUsers: AdminUsersService,
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.loadFilterOptions();
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

  private loadFilterOptions(): void {
    forkJoin({
      eventos: this.audit.getExpedienteBitacoraTiposEvento(),
      resultados: this.audit.getExpedienteBitacoraResultados(),
    }).subscribe({
      next: ({ eventos, resultados }) => {
        this.eventoOptions = eventos || [];
        this.resultadoOptions = resultados || [];
      },
      error: () => {
        this.eventoOptions = [];
        this.resultadoOptions = [];
      },
    });
  }

  private buildQuery(overrides?: {
    page?: number;
    pageSize?: number;
  }): Parameters<AuditService['listExpedienteBitacoraEvents']>[0] {
    const qp: Parameters<AuditService['listExpedienteBitacoraEvents']>[0] = {
      page: overrides?.page ?? this.page,
      pageSize: overrides?.pageSize ?? this.pageSize,
      sortBy: 'fecha_hora',
      sortDir: 'desc',
    };
    if (this.filters.q?.trim()) qp.q = this.filters.q.trim();
    if (this.filters.user !== 'Todos los usuarios') qp.usuario = this.filters.user;
    if (this.filters.evento?.trim()) qp.evento = this.filters.evento.trim();
    if (this.filters.resultado?.trim()) qp.resultado = this.filters.resultado.trim();
    const eid = String(this.filters.expedienteId ?? '').trim();
    if (eid && /^\d+$/.test(eid)) qp.expedienteId = Number(eid);
    if (this.filters.from?.trim()) qp.from = this.filters.from.trim();
    if (this.filters.to?.trim()) qp.to = this.filters.to.trim();
    return qp;
  }

  fetch() {
    this.loading = true;
    this.error = null;
    this.audit.listExpedienteBitacoraEvents(this.buildQuery()).subscribe({
      next: (res) => {
        this.events = res.items;
        this.totalItems = res.totalItems;
        this.totalPages = res.totalPages;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Error al cargar la bitácora de expedientes';
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

  clearFilters() {
    this.clearFilterApplyDebounce();
    this.filters = {
      q: '',
      user: 'Todos los usuarios',
      evento: '',
      resultado: '',
      expedienteId: '',
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

  openDetail(row: ExpedienteBitacoraItem) {
    this.detailOpen = true;
    this.detail = null;
    this.detailError = null;
    this.detailLoading = true;
    this.audit.getExpedienteBitacoraDetail(row.id_registro).subscribe({
      next: (item) => {
        this.detail = item;
        this.detailLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.detailError =
          err?.error?.message || 'No se pudo cargar el detalle del registro.';
        this.detailLoading = false;
      },
    });
  }

  closeDetail() {
    this.detailOpen = false;
    this.detail = null;
    this.detailError = null;
  }

  private loadUsers() {
    this.adminUsers.listEmails().subscribe({
      next: (emails) => (this.users = ['Todos los usuarios', ...emails]),
      error: () => (this.users = ['Todos los usuarios']),
    });
  }

  export(format: 'csv' | 'xml') {
    this.error = null;
    const pageSize = 100;
    this.audit.listExpedienteBitacoraEvents(this.buildQuery({ page: 1, pageSize })).subscribe({
      next: (res1) => {
        const totalPages = Math.max(1, res1.totalPages || 1);
        const items = [...(res1.items || [])];
        if (totalPages <= 1) {
          this.triggerExportBlob(format, items);
          return;
        }
        const rest = [];
        for (let p = 2; p <= totalPages; p++) {
          rest.push(
            this.audit.listExpedienteBitacoraEvents(this.buildQuery({ page: p, pageSize })),
          );
        }
        forkJoin(rest).subscribe({
          next: (pages) => {
            pages.forEach((r) => items.push(...(r.items || [])));
            this.triggerExportBlob(format, items);
          },
          error: (err) => {
            console.error(err);
            this.error = 'Error al exportar.';
          },
        });
      },
      error: (err) => {
        console.error(err);
        this.error = 'Error al exportar.';
      },
    });
  }

  private triggerExportBlob(format: 'csv' | 'xml', rows: ExpedienteBitacoraItem[]) {
    const filename =
      format === 'csv'
        ? `bitacora_expedientes_${new Date().toISOString().slice(0, 10)}.csv`
        : `bitacora_expedientes_${new Date().toISOString().slice(0, 10)}.xml`;
    const blob =
      format === 'csv' ? this.buildCsvBlob(rows) : this.buildXmlBlob(rows);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  private buildCsvBlob(rows: ExpedienteBitacoraItem[]): Blob {
    const escape = (val: unknown) => {
      const s = String(val ?? '');
      const mustQuote = /[",\n]/.test(s);
      return mustQuote ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = [
      'Fecha y hora',
      'ID registro',
      'ID expediente',
      'Código expediente',
      'Nombre expediente',
      'Estado expediente',
      'Usuario email',
      'Evento',
      'Resultado',
      'Estado anterior',
      'Estado nuevo',
    ];
    const line = (e: ExpedienteBitacoraItem) =>
      [
        e.fecha_hora,
        e.id_registro,
        e.expediente_id,
        e.expediente_codigo ?? '',
        e.expediente_nombre ?? '',
        e.expediente_estado_actual ?? '',
        e.usuario_email ?? '',
        e.evento ?? '',
        e.resultado ?? '',
        e.estado_anterior ?? '',
        e.estado_nuevo ?? '',
      ]
        .map(escape)
        .join(',');
    const csv = [headers.join(','), ...rows.map(line)].join('\n');
    return new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  }

  private buildXmlBlob(rows: ExpedienteBitacoraItem[]): Blob {
    const esc = (s: unknown) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bitacora_expedientes>
${rows
  .map(
    (e) => `  <evento>
    <fecha_hora>${esc(e.fecha_hora)}</fecha_hora>
    <id_registro>${esc(e.id_registro)}</id_registro>
    <expediente_id>${esc(e.expediente_id)}</expediente_id>
    <expediente_codigo>${esc(e.expediente_codigo)}</expediente_codigo>
    <expediente_nombre>${esc(e.expediente_nombre)}</expediente_nombre>
    <expediente_estado_actual>${esc(e.expediente_estado_actual)}</expediente_estado_actual>
    <usuario_email>${esc(e.usuario_email)}</usuario_email>
    <usuario_nombre_completo>${esc(e.usuario_nombre_completo)}</usuario_nombre_completo>
    <evento>${esc(e.evento)}</evento>
    <resultado>${esc(e.resultado)}</resultado>
    <estado_anterior>${esc(e.estado_anterior)}</estado_anterior>
    <estado_nuevo>${esc(e.estado_nuevo)}</estado_nuevo>
  </evento>`,
  )
  .join('\n')}
</bitacora_expedientes>`;
    return new Blob([xml], { type: 'application/xml;charset=utf-8' });
  }
}
