import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import {
  AccessExceptionService,
  ExceptionPermission,
  ExceptionRow
} from '../../../../core/services/access-exception.service';
import { AuditService } from '../../../../core/services/audit.service';

type UiUser = { id: number; email: string; fullName: string; rol: string };

@Component({
  selector: 'app-access-exceptions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './access-exceptions.component.html',
  styleUrls: ['./access-exceptions.component.css'],
})
export class AccessExceptionsComponent implements OnInit {
  /** Estados que no deben aparecer en los desplegables de filtro (formulario y listado). */
  private static readonly excludedStatesForFilterUi = new Set([
    'archivado',
    'eliminacion',
    'transferencia',
  ]);

  private static isExcludedStateForFilter(label: string): boolean {
    const key = String(label)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return AccessExceptionsComponent.excludedStatesForFilterUi.has(key);
  }

  // ====== Form (crear excepción) ======
  documents: any[] = [];
  filteredDocuments: any[] = [];
  selectedDocument: any | null = null;

  users: UiUser[] = [];
  filteredUsers: UiUser[] = [];
  selectedUser: UiUser | null = null;

  // ✅ roles SIEMPRE en este shape
  roles: Array<{ label: string; value: string }> = [];
  selectedRole: string = 'todos';

  states: string[] = [];
  selectedDocumentStatusForm: string = 'todos';

  userSearchTerm = '';
  documentSearchTerm = '';

  reason = '';
  permissions = {visualizar: false, editar: false, firmar: false};

  // ====== Listado (paginación + filtros) ======
  page = 1;
  /** 5 filas por página: menos scroll; página 1 = los 5 más recientes (orden DESC en backend) */
  pageSize = 5;
  totalItems = 0;
  totalPages = 1;

  filters = {
    user: 'Todos',
    status: 'Todos',
    dateFrom: '',
    dateTo: ''
  };

  items: ExceptionRow[] = [];
  loading = false;
  error: string | null = null;
  /** Validación del formulario izquierdo (no confundir con error del listado) */
  formError: string | null = null;
  applySuccess: string | null = null;

  constructor(
    private service: AccessExceptionService,
    private auditService: AuditService
  ) {
  }

  ngOnInit() {
    this.loadRoles();
    this.loadUsers();
    this.loadStates();
    this.loadDocuments();

    // primer fetch del listado
    this.fetch();
  }

  private toUpperValue(value: string | null | undefined): string {
    return String(value || '').toUpperCase();
  }

  onUserSearchInput(): void {
    this.userSearchTerm = this.toUpperValue(this.userSearchTerm);
    this.filterUsers();
  }

  onDocumentSearchInput(): void {
    this.documentSearchTerm = this.toUpperValue(this.documentSearchTerm);
    this.filterDocuments();
  }

  onReasonInput(): void {
    this.reason = this.toUpperValue(this.reason);
  }

  // =======================
  // Loaders
  // =======================
  private loadRoles() {
    this.service.getRoles().subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res?.items ?? res?.data ?? []);
        const list = raw
          // ✅ en tu BD la columna es nombre
          .map((r: any) => r?.nombre ?? r?.name ?? r?.rol ?? r)
          .filter(Boolean)
          .map((name: string) => String(name).trim())
          .filter((x: string) => x.length > 0);

        this.roles = list.map((name: string) => ({
          value: name.toLowerCase(),
          label: name
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, c => c.toUpperCase())
        }));
      },
      error: (err) => {
        console.log('ERROR ROLES =>', err);
        this.roles = [];
      }
    });
  }

  private loadUsers() {
    this.service.getUsers().subscribe({
      next: (users: any[]) => {
        this.users = (users || []).map((u: any) => {
          const rol =
            u.rol ??
            u.rol_nombre ??
            u.rolName ??
            u.nombre_rol ??
            ''; // fallback

          return {
            id: Number(u.id),
            email: String(u.email || ''),
            rol: String(rol || ''),
            fullName: `${u.nombre ?? ''} ${u.apellido1 ?? ''} ${u.apellido2 ?? ''}`.trim()
          };
        });

        this.filteredUsers = this.users.slice();

        // ❌ YA NO recalculamos roles desde users (eso te los pisaba en vacío)
        // si querés, podés dejar esto SOLO como fallback:
        if (!this.roles.length) {
          const uniqueRoles = Array.from(
            new Set(this.users.map(u => String(u.rol || '').trim()).filter(Boolean))
          );
          this.roles = uniqueRoles.map(r => ({
            value: r.toLowerCase(),
            label: r
              .replace(/_/g, ' ')
              .toLowerCase()
              .replace(/\b\w/g, c => c.toUpperCase())
          }));
        }
      },
      error: (err) => {
        console.log('ERROR USERS =>', err);
        this.users = [];
        this.filteredUsers = [];
      }
    });
  }

  private loadStates() {
    this.auditService.getDocumentStates().subscribe({
      next: (states: any[]) => {
        this.states = (states || [])
          .map((s: string) =>
            String(s)
              .replace(/_/g, ' ')
              .toLowerCase()
              .replace(/\b\w/g, (ch: string) => ch.toUpperCase())
          )
          .filter((label) => !AccessExceptionsComponent.isExcludedStateForFilter(label));
      },
      error: (err) => {
        console.log('ERROR STATES =>', err);
        this.states = [];
      }
    });
  }

  private loadDocuments() {
    this.service.getDocuments().subscribe({
      next: (docs: any[]) => {
        this.documents = (docs || []).map((d: any) => ({
          ...d,
          id: d.id ?? d.documentId ?? d.documento_id ?? d.id_documento ?? d.idDocumento,
          formattedState: this.formatState(d.estado || ''),
          formattedDate: d.fecha
        }));
        this.filterDocuments();
      },
      error: (err) => {
        console.log('ERROR DOCUMENTS =>', err);
        this.documents = [];
        this.filteredDocuments = [];
      }
    });
  }

  // =======================
  // Listado (query + fetch)
  // =======================
  private buildQuery() {
    const q: any = {
      page: this.page,
      pageSize: this.pageSize
    };

    if (this.filters.user !== 'Todos') q.userId = Number(this.filters.user);

    if (this.filters.status !== 'Todos') q.status = String(this.filters.status).toLowerCase();

    if (this.filters.dateFrom) q.dateFrom = this.filters.dateFrom;
    if (this.filters.dateTo) q.dateTo = this.filters.dateTo;

    return q;
  }

  fetch() {
    this.loading = true;
    this.error = null;

    this.service.listExceptions(this.buildQuery()).subscribe({
      next: (res) => {
        this.items = res?.items || [];
        this.page = res?.page ?? this.page;
        this.pageSize = res?.pageSize ?? this.pageSize;
        this.totalItems = res?.totalItems ?? 0;
        this.totalPages = res?.totalPages ?? 1;
        this.loading = false;
      },
      error: (err) => {
        console.error('LIST EXCEPTIONS ERROR =>', err);
        this.items = [];
        this.totalItems = 0;
        this.totalPages = 1;
        this.error = err?.error?.message || `Error cargando excepciones (${err?.status})`;
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
      user: 'Todos',
      status: 'Todos',
      dateFrom: '',
      dateTo: ''
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

  goTo(p: number) {
    if (p !== this.page) {
      this.page = p;
      this.fetch();
    }
  }

  // =======================
  // Formulario: filtros locales
  // =======================
  filterUsers() {
    const roleNorm = this.selectedRole === 'todos' ? null : this.selectedRole;
    const q = this.userSearchTerm.toLowerCase();

    this.filteredUsers = this.users.filter(u => {
      const matchQ = (u.fullName + ' ' + u.email).toLowerCase().includes(q);
      const matchR = !roleNorm || String(u.rol || '').toLowerCase() === roleNorm;
      return matchQ && matchR;
    });
  }

  filterDocuments() {
    const q = this.documentSearchTerm.toLowerCase();
    const state = this.selectedDocumentStatusForm === 'todos' ? null : this.selectedDocumentStatusForm.toLowerCase();

    this.filteredDocuments = this.documents.filter((d: any) => {
      const byTitle = String(d.titulo || '').toLowerCase().includes(q);
      const byState = !state || String(d.estado || '').toLowerCase() === state;
      return byTitle && byState;
    });
  }

  // =======================
  // Helpers
  // =======================
  formatState(state: string): string {
    return state ? state.charAt(0).toUpperCase() + state.slice(1).toLowerCase() : '';
  }

  formatPermissions(p: string | string[] | null | undefined): string {
    if (!p) return '';

    const map: Record<string, string> = {
      VIEW: 'Visualizar',
      EDIT: 'Editar',
      SIGN: 'Firmar'
    };

    const list = Array.isArray(p)
      ? p
      : String(p).split(',');

    return list
      .map(x => map[x.trim()] ?? x)
      .join(', ');
  }


  // =======================
  // Validación + permisos
  // =======================
  /** En acceso por excepciones solo llegan docs CREACION/EDICION y ahí se permiten EDIT y SIGN. */
  private docEstadoRaw(doc: any | null): string {
    return String(doc?.estado ?? '').toUpperCase();
  }

  puedeEditarPorEstado(doc: any | null): boolean {
    const s = this.docEstadoRaw(doc);
    return s === 'CREACION' || s === 'EDICION';
  }

  puedeFirmarPorEstado(doc: any | null): boolean {
    const s = this.docEstadoRaw(doc);
    return s === 'CREACION' || s === 'EDICION';
  }

  onDocumentForExceptionChange(): void {
    if (!this.puedeEditarPorEstado(this.selectedDocument) && this.permissions.editar) {
      this.permissions.editar = false;
    }
    if (!this.puedeFirmarPorEstado(this.selectedDocument) && this.permissions.firmar) {
      this.permissions.firmar = false;
    }
  }

  isFormValid(): boolean {
    const hasPerms = this.permissions.visualizar || this.permissions.editar || this.permissions.firmar;
    const hasUser = !!this.selectedUser;
    const hasDoc = !!this.selectedDocument;
    const hasReason = this.reason.trim().length > 0;
    if (!hasPerms || !hasUser || !hasDoc || !hasReason) {
      return false;
    }
    if (this.permissions.editar && !this.puedeEditarPorEstado(this.selectedDocument)) {
      return false;
    }
    if (this.permissions.firmar && !this.puedeFirmarPorEstado(this.selectedDocument)) {
      return false;
    }
    return true;
  }

  /** Mensaje explícito para el usuario (p. ej. motivo obligatorio vacío) */
  formValidationMessage(): string {
    const parts: string[] = [];
    if (!this.selectedUser) {
      parts.push('seleccione un usuario');
    }
    if (!this.selectedDocument) {
      parts.push('seleccione un documento');
    }
    if (!this.permissions.visualizar && !this.permissions.editar && !this.permissions.firmar) {
      parts.push('elija al menos un permiso (Visualizar, Editar o Firmar)');
    }
    if (this.selectedDocument && this.permissions.editar && !this.puedeEditarPorEstado(this.selectedDocument)) {
      parts.push('edición solo si el documento está en Creación o Edición');
    }
    if (this.selectedDocument && this.permissions.firmar && !this.puedeFirmarPorEstado(this.selectedDocument)) {
      parts.push('firma solo si el documento está en Creación o Edición');
    }
    if (!this.reason.trim()) {
      parts.push('escriba el motivo de la excepción');
    }
    if (!parts.length) {
      return '';
    }
    return 'Complete el formulario: ' + parts.join('; ') + '.';
  }

  togglePermission(p: 'visualizar' | 'editar' | 'firmar') {
    if (p === 'editar' && !this.puedeEditarPorEstado(this.selectedDocument)) {
      return;
    }
    if (p === 'firmar' && !this.puedeFirmarPorEstado(this.selectedDocument)) {
      return;
    }
    this.permissions[p] = !this.permissions[p];
  }

  selectedPermissionsApi(): ExceptionPermission[] {
    const out: ExceptionPermission[] = [];
    if (this.permissions.visualizar) out.push('VIEW');
    if (this.permissions.editar) out.push('EDIT');
    if (this.permissions.firmar) out.push('SIGN');
    return out;
  }

  // =======================
  // CRUD
  // =======================
  applyException() {
    this.formError = null;
    this.applySuccess = null;

    if (!this.isFormValid()) {
      this.formError = this.formValidationMessage();
      return;
    }

    const docId = Number(this.selectedDocument!.id);
    const userId = Number(this.selectedUser!.id);
    if (!Number.isFinite(docId) || docId <= 0 || !Number.isFinite(userId) || userId <= 0) {
      this.formError = 'Usuario o documento no válido; vuelva a seleccionar ambos.';
      return;
    }

    const payload = {
      userId,
      documentId: docId,
      permissions: this.selectedPermissionsApi(),
      reason: this.toUpperValue(this.reason).trim()
    };

    this.service.applyException(payload).subscribe({
      next: () => {
        this.formError = null;
        this.error = null;
        this.applySuccess =
          'Excepción registrada correctamente. Actualizando el listado…';
        this.resetForm();
        this.page = 1;
        // Quitar filtros de fecha del panel derecho para que la fila nueva no quede oculta
        this.filters.dateFrom = '';
        this.filters.dateTo = '';
        this.fetch();
        setTimeout(() => {
          this.applySuccess = null;
        }, 6000);
      },
      error: (err) => {
        console.error('APPLY EXCEPTION ERROR =>', err);
        this.formError =
          err?.error?.message ||
          `No se pudo aplicar la excepción (${err?.status ?? 'error'})`;
      }
    });
  }

  deleteException(row: ExceptionRow) {

    const userId = Number(row.userId);
    const documentId = Number(row.documentId);

    this.service.deleteException(userId, documentId, 'remoción por admin').subscribe({
      next: () => this.fetch(),
      error: (err) => console.error('DELETE EXCEPTION ERROR =>', err)
    });
  }

  resetForm() {
    this.selectedUser = null;
    this.selectedDocument = null;
    this.permissions = {visualizar: false, editar: false, firmar: false};
    this.reason = '';
    this.userSearchTerm = '';
    this.documentSearchTerm = '';
    this.filteredUsers = this.users.slice();
    this.filterDocuments();
  }

  get rangeEnd(): number {
    return Math.min(this.page * this.pageSize, this.totalItems);
  }

  // ===== Modal eliminar =====
  showDeleteModal = false;
  deleteTarget: ExceptionRow | null = null;

  openDeleteModal(row: ExceptionRow) {
    this.deleteTarget = row;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.deleteTarget = null;
  }

  confirmDelete() {
    if (!this.deleteTarget) return;

    const userId = Number(this.deleteTarget.userId);
    const documentId = Number(this.deleteTarget.documentId);

    this.service.deleteException(userId, documentId, 'remoción por admin').subscribe({
      next: () => {
        this.closeDeleteModal();
        this.fetch();
      },
      error: (err) => {
        console.error('DELETE EXCEPTION ERROR =>', err);
        // opcional: mostrar error en pantalla
        this.error = err?.error?.message || `No se pudo eliminar (${err?.status})`;
        this.closeDeleteModal();
      }
    });
  }

}
