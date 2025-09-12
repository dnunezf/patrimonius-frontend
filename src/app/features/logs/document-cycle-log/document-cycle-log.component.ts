import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuditService, AuditItem, AuditDetail } from '../../../../core/services/audit.service';
import { AdminUsersService } from '../../../../core/services/admin-users.service';

type ResultType = 'Permitida' | 'Denegada';
type ActionType = 'Creacion' | 'Edicion' | 'Firma' | 'Archivado' | 'Eliminacion' | 'Transferencia';

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
  states: string[] = ['Todos los estados'];

  // Filters
  filters = {
    q: '',
    user: 'Todos los usuarios',
    state: 'Todos los estados',
    action: 'Todas las acciones',
    result: 'Todos los resultados',
    document: ''
  };

  // Static combos
  actions: Array<'Todas las acciones' | ActionType> = [
    'Todas las acciones', 'Creacion', 'Edicion', 'Firma', 'Archivado', 'Eliminacion', 'Transferencia'
  ];
  results: Array<'Todos los resultados' | ResultType> = [
    'Todos los resultados', 'Permitida', 'Denegada'
  ];

  // Data/pagination
  loading = false;
  error: string | null = null;
  page = 1;
  pageSize = 25;
  sortBy = 'fecha_hora';
  sortDir: 'asc' | 'desc' = 'desc';
  events: AuditItem[] = [];
  totalItems = 0;
  totalPages = 1;

  // Detail modal state
  showDetail = false;
  detailLoading = false;
  detailError: string | null = null;
  detail: AuditDetail | null = null;

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
    if (this.filters.result !== 'Todos los resultados') qp.resultado = this.filters.result as ResultType;
    if (this.filters.document?.trim()) qp.documento = this.filters.document.trim();

    const dbState = this.mapUiLabelToDbState(this.filters.state);
    if (dbState) qp.estado = dbState;

    if (this.filters.action !== 'Todas las acciones') {
      qp.q = `${qp.q ? qp.q + ' ' : ''}${this.filters.action}`;
    }
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

  applyFilters() { this.page = 1; this.fetch(); }
  clearFilters() {
    this.filters = {
      q:'', user:'Todos los usuarios', state:'Todos los estados',
      action:'Todas las acciones', result:'Todos los resultados', document:''
    };
    this.page = 1;
    this.fetch();
  }

  goPrev() { if (this.page > 1) { this.page--; this.fetch(); } }
  goNext() { if (this.page < this.totalPages) { this.page++; this.fetch(); } }

  // Export functionality
  export(format: 'csv' | 'xml') {
    const params = this.buildQuery();
    this.error = null;
    this.audit.exportEvents(format, params).subscribe({
      next: (res) => {
        const blob = res.body!;
        const cd = res.headers.get('Content-Disposition') || '';
        const match = /filename="?([^"]+)"?/i.exec(cd);
        const fallbackName = format === 'csv' ? 'eventos_auditoria.csv' : 'eventos_auditoria.xml';
        const filename = (match && match[1]) ? match[1] : fallbackName;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      },
      error: async (err) => {
        try {
          const blob = err?.error as Blob;
          const text = await blob.text();
          let msg = 'Error al exportar.';
          try {
            const json = JSON.parse(text);
            if (json?.message) msg = json.message;
          } catch {
            if (text?.trim()) msg = text;
          }
          this.error = msg;
        } catch {
          this.error = 'Error al exportar.';
        }
      }
    });
  }

  // ---- Detail modal handlers ----
  openDetail(e: AuditItem) {
    if (!e?.id_evento) return;
    this.showDetail = true;
    this.detail = null;
    this.detailError = null;
    this.detailLoading = true;

    this.audit.getEventDetail(e.id_evento).subscribe({
      next: (d) => {
        this.detail = d;
        this.detailLoading = false;
      },
      error: (err) => {
        console.error('Failed to load detail', err);
        this.detailError = 'No se pudo cargar el detalle del evento.';
        this.detailLoading = false;
      }
    });
  }

  closeDetail() {
    this.showDetail = false;
    this.detail = null;
    this.detailError = null;
    this.detailLoading = false;
  }

  // ---- Helpers for state and badges ----
  resultClass(res: string | null | undefined) {
    switch ((res || '').toLowerCase()) {
      case 'permitida': return 'badge badge-green';
      case 'denegada':  return 'badge badge-red';
      default:          return 'badge';
    }
  }

  stateClass(state: string | null | undefined) {
    const s = (state || '').trim().toLowerCase();
    if (s === 'firmado completo') return 'badge badge-green';
    if (s === 'firmado parcial')  return 'badge badge-blue';
    if (s === 'archivado')        return 'badge badge-brown';
    return 'badge';
  }

  private loadUsers() {
    this.adminUsers.listEmails().subscribe({
      next: (emails) => this.users = ['Todos los usuarios', ...emails],
      error: () => this.users = ['Todos los usuarios']
    });
  }

  private mapDbStateToUiLabel(dbValue: string): string {
    const v = (dbValue || '').trim().toUpperCase();
    if (v === 'ARCHIVADO') return 'Archivado';
    if (v === 'FIRMADO' || v === 'FIRMA' || v === 'FIRMADO_COMPLETO') return 'Firmado Completo';
    if (v === 'FIRMADO_PARCIAL' || v === 'FIRMA_PARCIAL') return 'Firmado Parcial';
    return v ? v.charAt(0) + v.slice(1).toLowerCase() : '';
  }

  private mapUiLabelToDbState(uiValue: string): string | null {
    const v = (uiValue || '').trim().toLowerCase();
    if (!v || v === 'todos los estados') return null;
    if (v === 'archivado') return 'ARCHIVADO';
    if (v === 'firmado completo') return 'FIRMADO';
    if (v === 'firmado parcial')  return 'FIRMADO_PARCIAL';
    return v.toUpperCase();
  }

  private loadStates() {
    this.audit.getDocumentStates().subscribe({
      next: (dbStates) => {
        const uiStates = Array.from(new Set((dbStates || []).map(s => this.mapDbStateToUiLabel(s)).filter(Boolean)));
        const sorted = uiStates.sort((a, b) => a.localeCompare(b));
        this.states = ['Todos los estados', ...sorted];
      },
      error: () => this.states = ['Todos los estados']
    });
  }
}
