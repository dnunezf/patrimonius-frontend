import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuditService, AuditItem, AuditDetail } from '../../../../core/services/audit.service';
import { AdminUsersService } from '../../../../core/services/admin-users.service';

type ResultType = 'Permitido' | 'Denegado';

@Component({
  selector: 'app-document-cycle-log',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './document-cycle-log.component.html',
  styleUrls: ['./document-cycle-log.component.css'],
})


export class DocumentCycleLogComponent implements OnInit {

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



  constructor(
    private audit: AuditService,
    private adminUsers: AdminUsersService
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.loadStates();
    this.fetch();
  }



  // Build query params for backend
  private buildQuery() {
    const qp: any = {
      page: this.page,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortDir: this.sortDir
    };
    if (this.filters.q?.trim()) qp.q = this.filters.q.trim();
    if (this.filters.user !== 'Todos los usuarios') qp.usuario = this.filters.user;
    const dbResult = this.mapUiResultToDbResult(this.filters.result);
    if (dbResult) qp.resultado = dbResult;

    if (this.filters.document?.trim()) qp.documento = this.filters.document.trim();

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

  applyFilters() {
    this.page = 1;
    this.fetch();
  }

  clearFilters() {
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

  goPrev() { if (this.page > 1) { this.page--; this.fetch(); } }
  goNext() { if (this.page < this.totalPages) { this.page++; this.fetch(); } }

  // Export with current filters; CSV/XML built in frontend with column names: Título, Nombre (no Razón)
  export(format: 'csv' | 'xml') {
    const params = { ...this.buildQuery(), page: 1, pageSize: 10000 };
    this.error = null;
    this.audit.listEvents(params).subscribe({
      next: (res) => {
        const rows = res.items || [];
        const filename = format === 'csv' ? 'eventos_auditoria.csv' : 'eventos_auditoria.xml';
        const blob = format === 'csv' ? this.buildCsvBlob(rows) : this.buildXmlBlob(rows);
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
  }

  private buildCsvBlob(rows: AuditItem[]): Blob {
    const escape = (val: unknown) => {
      const s = String(val ?? '');
      const mustQuote = /[",\n]/.test(s);
      return mustQuote ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = ['Fecha y hora', 'Usuario', 'Título', 'Nombre', 'Acción solicitada', 'Estado del documento', 'Resultado'];
    const line = (e: AuditItem) => [
      e.fecha_hora,
      e.usuario,
      e.documento_titulo ?? '',
      [e.documento_codigo_unico, e.documento_codigo_oficial].filter(Boolean).join(' / ') || '',
      e.accion_solicitada ?? '',
      e.estado_documento ?? '',
      e.resultado ?? ''
    ].map(escape).join(',');
    const csv = [headers.join(','), ...rows.map(line)].join('\n');
    return new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  }

  private buildXmlBlob(rows: AuditItem[]): Blob {
    const esc = (s: unknown) => String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<eventos_auditoria>
${rows.map(e => `  <evento>
    <fecha_hora>${esc(e.fecha_hora)}</fecha_hora>
    <usuario>${esc(e.usuario)}</usuario>
    <titulo>${esc(e.documento_titulo)}</titulo>
    <nombre>${esc([e.documento_codigo_unico, e.documento_codigo_oficial].filter(Boolean).join(' / ') || '')}</nombre>
    <accion_solicitada>${esc(e.accion_solicitada)}</accion_solicitada>
    <estado_documento>${esc(e.estado_documento)}</estado_documento>
    <resultado>${esc(e.resultado)}</resultado>
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
    if (!value) {
      if (field === 'q') this.filters.q = '';
      else this.filters.document = '';
      return;
    }
    const words = value.trim().split(/\s+/);
    const limited = words.length > this.maxWords ? words.slice(0, this.maxWords).join(' ') : value;
    if (field === 'q') this.filters.q = limited;
    else this.filters.document = limited;
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


}
