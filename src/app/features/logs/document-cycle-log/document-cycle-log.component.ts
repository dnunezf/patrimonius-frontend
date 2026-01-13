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

  actions: string[] = []; // Array de acciones dinámico

  results: Array<'Todos los resultados' | ResultType> = [
    'Todos los resultados', 'Permitido', 'Denegado'
  ];

  // Filters
  filters = {
    q: '',
    user: 'Todos los usuarios',
    state: 'Todos los estados',
    result: 'Todos los resultados',
    document: '',
    action: 'Todas las acciones' // Se utilizará "Todas las acciones" por defecto
  };

  states: string[] = [];

  loading = false;
  error: string | null = null;
  page = 1;
  pageSize = 25;
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
    this.loadUsers(); // Loads users
    this.loadStates(); // Fetch the states from backend
    this.loadActions(); // Load actions dynamically from the backend
    this.fetch(); // Fetch data from the backend
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

    const dbState = this.mapUiLabelToDbState(this.filters.state);
    if (dbState) qp.estado = dbState;

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
      state: 'Todos los estados',
      result: 'Todos los resultados',
      document: '',
      action: 'Todas las acciones' // Default action value
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



  resultClass(res: string | null | undefined) {
    const v = (res || '').trim().toLowerCase();

    if (v === 'permitida' || v === 'permitido') return 'badge badge-green';
    if (v === 'denegada'  || v === 'denegado')  return 'badge badge-red';

    return 'badge';
  }


  stateClass(state: string | null | undefined) {
    const stateClasses = {
      'firma': 'badge badge-green',
      'firma parcial': 'badge badge-blue',
      'archivado': 'badge badge-brown',
      'creacion': 'badge badge-yellow',
      'edicion': 'badge badge-orange',
      'eliminacion': 'badge badge-red',
      'transferencia': 'badge badge-purple'
    };

    const s = (state || '').trim().toLowerCase();
    return stateClasses[s as keyof typeof stateClasses] || 'badge';
  }


  private loadUsers() {
    this.adminUsers.listEmails().subscribe({
      next: (emails) => this.users = ['Todos los usuarios', ...emails],
      error: () => this.users = ['Todos los usuarios']
    });
  }

  // Fetch the actions from backend
  private loadActions() {
    this.audit.getActionTypes().subscribe({
      next: (actions) => {
        this.actions = ['Todas las acciones', ...actions.map(this.formatToDisplay)];  // Adding "Todas las acciones" at the beginning
      },
      error: () => {
        this.actions = ['Todas las acciones']; // Fallback in case of error
      }
    });
  }

  // Fetch the states from backend
  private loadStates() {
    this.audit.getDocumentStates().subscribe({
      next: (dbStates) => {
        this.states = ['Todos los estados', ...dbStates.map(this.formatToDisplay)];  // Adding "Todos los estados" at the beginning
      },
      error: () => {
        this.states = ['Todos los estados']; // Fallback in case of error
      }
    });
  }


  // Map UI state labels to backend values
  private mapUiLabelToDbState(uiValue: string): string | null {
    const v = (uiValue || '').trim().toLowerCase();
    if (!v || v === 'todos los estados') return null;
    if (v === 'archivado') return 'ARCHIVADO';
    if (v === 'firma') return 'FIRMADO';
    if (v === 'firma parcial') return 'FIRMADO_PARCIAL';
    if (v === 'creacion') return 'CREACION';
    if (v === 'edicion') return 'EDICION';
    if (v === 'eliminacion') return 'ELIMINACION';
    if (v === 'transferencia') return 'TRANSFERENCIA';

    return null;
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
