import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  AuditService,
  PermissionBitacoraItem,
  PermissionBitacoraDetail,
} from '../../../../core/services/audit.service';
import { AdminUsersService } from '../../../../core/services/admin-users.service';
import { UserActivityDetailModalComponent } from '../user-activity-detail-modal/user-activity-detail-modal.component';

@Component({
  selector: 'app-user-activity-log',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, UserActivityDetailModalComponent],
  templateUrl: './user-activity-log.component.html',
  styleUrls: ['./user-activity-log.component.css'],
})
export class UserActivityLogComponent implements OnInit {
  users: string[] = ['Todos los usuarios'];

  /** Valores fijos alineados con el dominio (tipo_flujo). */
  readonly tipoFlujoOptions = [
    'EXCEPCION_ACCESO',
    'SOLICITUD_ACCESO_EXTERNO',
    'DESCARGA_DOCUMENTO_APROBADO',
  ] as const;

  /** Valores fijos alineados con estado_flujo (ENUM). */
  readonly estadoFlujoOptions = [
    'PENDIENTE',
    'APROBADA',
    'DENEGADA',
    'REVOCADA',
    'EXPIRADA',
    'PERMITIDO',
    'DENEGADO',
  ] as const;

  filters = {
    user: 'Todos los usuarios',
    documento: '',
    tipoFlujo: '',
    estadoFlujo: '',
    from: '',
    to: '',
  };

  loading = false;
  error: string | null = null;

  page = 1;
  pageSize = 10;
  events: PermissionBitacoraItem[] = [];
  totalPages = 1;
  totalItems = 0;

  detailOpen = false;
  detailLoading = false;
  detailError: string | null = null;
  detail: PermissionBitacoraDetail | null = null;

  readonly maxWords = 5;

  constructor(
    private audit: AuditService,
    private adminUsers: AdminUsersService,
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.fetch();
  }

  private buildQuery(overrides?: {
    page?: number;
    pageSize?: number;
  }): Parameters<AuditService['listPermissionBitacoraEvents']>[0] {
    const qp: Parameters<AuditService['listPermissionBitacoraEvents']>[0] = {
      page: overrides?.page ?? this.page,
      pageSize: overrides?.pageSize ?? this.pageSize,
      sortBy: 'fecha_hora',
      sortDir: 'desc',
    };
    if (this.filters.user !== 'Todos los usuarios') qp.usuario = this.filters.user;
    if (this.filters.documento?.trim()) qp.documento = this.filters.documento.trim();
    if (this.filters.tipoFlujo?.trim()) qp.tipoFlujo = this.filters.tipoFlujo.trim();
    if (this.filters.estadoFlujo?.trim()) qp.estadoFlujo = this.filters.estadoFlujo.trim();
    if (this.filters.from?.trim()) qp.from = this.filters.from.trim();
    if (this.filters.to?.trim()) qp.to = this.filters.to.trim();
    return qp;
  }

  fetch() {
    this.loading = true;
    this.error = null;
    this.audit.listPermissionBitacoraEvents(this.buildQuery()).subscribe({
      next: (res) => {
        this.events = res.items;
        this.totalItems = res.totalItems;
        this.totalPages = res.totalPages;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Error cargando bitácora de permisos y actividad';
        this.loading = false;
      },
    });
  }

  applyFilters() {
    this.page = 1;
    this.fetch();
  }

  clearFilters() {
    this.filters = {
      user: 'Todos los usuarios',
      documento: '',
      tipoFlujo: '',
      estadoFlujo: '',
      from: '',
      to: '',
    };
    this.page = 1;
    this.fetch();
  }

  goPrev() {
    if (this.page > 1) {
      this.page--;
      this.fetch();
    }
  }

  goNext() {
    if (this.page < this.totalPages) {
      this.page++;
      this.fetch();
    }
  }

  limitDocumentWords(value: string): void {
    if (!value) {
      this.filters.documento = '';
      return;
    }
    const words = value.trim().split(/\s+/);
    this.filters.documento =
      words.length > this.maxWords ? words.slice(0, this.maxWords).join(' ') : value;
  }

  openDetail(row: PermissionBitacoraItem) {
    this.detailOpen = true;
    this.detail = null;
    this.detailError = null;
    this.detailLoading = true;
    this.audit.getPermissionBitacoraDetail(row.id_registro).subscribe({
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

  /**
   * Exporta con los filtros y orden actuales. El API limita pageSize a 100;
   * se solicitan todas las páginas y se unen en un solo archivo.
   */
  export(format: 'csv' | 'xml') {
    this.error = null;
    const pageSize = 100;
    this.audit.listPermissionBitacoraEvents(this.buildQuery({ page: 1, pageSize })).subscribe({
      next: (res1) => {
        const totalPages = Math.max(1, res1.totalPages || 1);
        const items = [...(res1.items || [])];
        if (totalPages <= 1) {
          this.triggerExportBlob(format, items);
          return;
        }
        const rest = [];
        for (let p = 2; p <= totalPages; p++) {
          rest.push(this.audit.listPermissionBitacoraEvents(this.buildQuery({ page: p, pageSize })));
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

  private triggerExportBlob(format: 'csv' | 'xml', rows: PermissionBitacoraItem[]) {
    const filename =
      format === 'csv'
        ? `bitacora_permisos_${new Date().toISOString().slice(0, 10)}.csv`
        : `bitacora_permisos_${new Date().toISOString().slice(0, 10)}.xml`;
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

  private buildCsvBlob(rows: PermissionBitacoraItem[]): Blob {
    const escape = (val: unknown) => {
      const s = String(val ?? '');
      const mustQuote = /[",\n]/.test(s);
      return mustQuote ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = [
      'Fecha y hora',
      'ID registro',
      'Solicitud',
      'Título',
      'Nombre',
      'Responsable',
      'Usuario objetivo',
      'Tipo flujo',
      'Estado flujo',
      'Acción',
      'Inicio acceso',
      'Fin acceso',
    ];
    const line = (e: PermissionBitacoraItem) =>
      [
        e.fecha_hora,
        e.id_registro,
        e.solicitud_id ?? '',
        e.titulo_documento ?? '',
        e.numero_serie_documento ?? '',
        e.responsable_email ?? '',
        e.usuario_objetivo_email ?? '',
        e.tipo_flujo ?? '',
        e.estado_flujo ?? '',
        e.accion ?? '',
        e.fecha_inicio_acceso ?? '',
        e.fecha_fin_acceso ?? '',
      ]
        .map(escape)
        .join(',');
    const csv = [headers.join(','), ...rows.map(line)].join('\n');
    return new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  }

  private buildXmlBlob(rows: PermissionBitacoraItem[]): Blob {
    const esc = (s: unknown) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bitacora_permisos>
${rows
  .map(
    (e) => `  <evento>
    <fecha_hora>${esc(e.fecha_hora)}</fecha_hora>
    <id_registro>${esc(e.id_registro)}</id_registro>
    <solicitud_id>${esc(e.solicitud_id)}</solicitud_id>
    <titulo>${esc(e.titulo_documento)}</titulo>
    <nombre>${esc(e.numero_serie_documento)}</nombre>
    <responsable_email>${esc(e.responsable_email)}</responsable_email>
    <usuario_objetivo_email>${esc(e.usuario_objetivo_email)}</usuario_objetivo_email>
    <tipo_flujo>${esc(e.tipo_flujo)}</tipo_flujo>
    <estado_flujo>${esc(e.estado_flujo)}</estado_flujo>
    <accion>${esc(e.accion)}</accion>
    <fecha_inicio_acceso>${esc(e.fecha_inicio_acceso)}</fecha_inicio_acceso>
    <fecha_fin_acceso>${esc(e.fecha_fin_acceso)}</fecha_fin_acceso>
  </evento>`,
  )
  .join('\n')}
</bitacora_permisos>`;
    return new Blob([xml], { type: 'application/xml;charset=utf-8' });
  }
}
