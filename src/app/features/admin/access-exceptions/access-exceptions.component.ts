import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AccessExceptionService } from '../../../../core/services/access-exception.service';
import { CategoriaService } from '../../../../core/services/categoria.service';
import { AuditService } from '../../../../core/services/audit.service';

type UiUser = { id: number; email: string; fullName: string; rol: string; };

@Component({
  selector: 'app-access-exceptions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './access-exceptions.component.html',
  styleUrls: ['./access-exceptions.component.css'],
  providers: [DatePipe]
})
export class AccessExceptionsComponent implements OnInit {
  // Documents
  documents: any[] = [];
  filteredDocuments: any[] = [];
  selectedDocument: any | null = null;

  // Categories
  categorias: any[] = [];
  selectedCategoria: string = 'todos';

  // States
  states: string[] = [];
  selectedDocumentStatus: string = 'todos';

  // Users
  users: UiUser[] = [];
  filteredUsers: UiUser[] = [];
  selectedUser: UiUser | null = null;
  roles: string[] = [];
  selectedRole: string = 'todos';

  // Search inputs
  userSearchTerm = '';
  documentSearchTerm = '';

  // Form data
  reason = '';
  permissions = { visualizar: false, editar: false, firmar: false };

  // Exceptions list from backend
  activeExceptions: any[] = [];

  constructor(
    private accessExceptionService: AccessExceptionService,
    private datePipe: DatePipe,
    private categoriaService: CategoriaService,
    private auditService: AuditService
  ) {}

  ngOnInit() {
    this.accessExceptionService.getRoles().subscribe({
      next: roles => this.roles = roles.map(r => r.replace(/_/g,' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())),
      error: () => this.roles = []
    });

    this.accessExceptionService.getUsers().subscribe({
      next: users => {
        this.users = users.map(u => ({
          id: u.id,
          email: u.email,
          rol: u.rol,
          fullName: `${u.nombre} ${u.apellido1} ${u.apellido2 ?? ''}`.trim()
        }));
        this.filteredUsers = this.users.slice();
      },
      error: () => { this.users = []; this.filteredUsers = []; }
    });

    this.categoriaService.getCategorias().subscribe({
      next: cats => { this.categorias = cats || []; },
      error: () => { this.categorias = []; }
    });

    this.auditService.getDocumentStates().subscribe({
      next: states => this.states = (states || []).map((s: string) =>
        s.replace(/_/g,' ').toLowerCase().replace(/\b\w/g, (ch:string)=>ch.toUpperCase())),
      error: () => this.states = []
    });

    this.accessExceptionService.getDocuments().subscribe({
      next: docs => {
        this.documents = (docs || []).map((d:any)=>({
          ...d,
          categoria: this.formatCategory(d.categoria || 'Sin categoría'),
          formattedDate: this.formatDate(d.fecha),
          formattedState: this.formatState(d.estado || '')
        }));
        this.filterDocuments();
      },
      error: () => { this.documents = []; this.filteredDocuments = []; }
    });

    this.reloadExceptions();
  }

  // ------ Filters ------
  filterUsers() {
    const roleNorm = this.selectedRole === 'todos'
      ? null
      : this.selectedRole.replace(/ /g,'_').toLowerCase();
    this.filteredUsers = this.users.filter(u => {
      const matchQ = (u.fullName + ' ' + u.email).toLowerCase().includes(this.userSearchTerm.toLowerCase());
      const matchR = !roleNorm || u.rol.toLowerCase() === roleNorm;
      return matchQ && matchR;
    });
  }

  filterDocuments() {
    const q = this.documentSearchTerm.toLowerCase();
    const cat = this.selectedCategoria === 'todos' ? null : this.selectedCategoria.toLowerCase();
    const state = this.selectedDocumentStatus === 'todos' ? null : this.selectedDocumentStatus.toLowerCase();

    this.filteredDocuments = this.documents.filter((d:any) => {
      const byTitle = d.titulo.toLowerCase().includes(q);
      const byCat = !cat || String(d.categoria).toLowerCase().includes(cat);
      const byState = !state || String(d.estado || '').toLowerCase() === state;
      return byTitle && byCat && byState;
    });
  }

  // ------ Formatting helpers ------
  formatState(state: string): string {
    return state ? state.charAt(0).toUpperCase() + state.slice(1).toLowerCase() : '';
  }
  formatCategory(category: string): string {
    return category?.toLowerCase().replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Sin categoría';
  }
  formatDate(date: string): string {
    const d = new Date(date);
    return isNaN(+d) ? '' : `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
  }

  // ------ Validation ------
  isFormValid(): boolean {
    const hasPerms = this.permissions.visualizar || this.permissions.editar || this.permissions.firmar;
    const hasUser = !!this.selectedUser;
    const hasDoc = !!this.selectedDocument;
    const hasReason = this.reason.trim().length > 0;
    return hasPerms && hasUser && hasDoc && hasReason;
  }

  // ------ Permissions UI ------
  togglePermission(p: 'visualizar'|'editar'|'firmar') {
    this.permissions[p] = !this.permissions[p];
  }
  selectedPermissionsApi(): ('VIEW'|'EDIT'|'SIGN')[] {
    const out: ('VIEW'|'EDIT'|'SIGN')[] = [];
    if (this.permissions.visualizar) out.push('VIEW');
    if (this.permissions.editar) out.push('EDIT');
    if (this.permissions.firmar) out.push('SIGN');
    return out;
  }
  selectedPermissionsLabel(): string {
    const s: string[] = [];
    if (this.permissions.visualizar) s.push('Visualizar');
    if (this.permissions.editar) s.push('Editar');
    if (this.permissions.firmar) s.push('Firmar');
    return s.join(', ');
  }

  // ------ Exceptions CRUD ------
  reloadExceptions() {
    this.accessExceptionService.listExceptions().subscribe({
      next: list => {
        this.activeExceptions = (list || []).map((e:any)=>({
          userId: e.userId,
          documentId: e.documentId,
          user: `${e.nombre} ${e.apellido1} ${e.apellido2 ?? ''}`.trim(),
          email: e.email,
          document: e.titulo,
          documentNumber: e.numero_serie,
          permission: String(e.permissions).replace(/,/g, ', '),
          date: new Date().toLocaleDateString(),
          reason: e.motive ?? e.reason ?? e.descripcion ?? ''
          // not stored per row in query; shown when applied
        }));
      },
      error: () => this.activeExceptions = []
    });
  }

  applyException() {
    if (!this.isFormValid()) return;
    const payload = {
      userId: this.selectedUser!.id,
      documentId: this.selectedDocument!.id,
      permissions: this.selectedPermissionsApi(),
      reason: this.reason.trim()
    };
    this.accessExceptionService.applyException(payload).subscribe({
      next: () => { this.resetForm(); this.reloadExceptions(); },
      error: err => console.error('Error al aplicar excepción:', err)
    });
  }

  deleteException(ex: any) {
    this.accessExceptionService.deleteException(ex.userId, ex.documentId, 'remoción por admin').subscribe({
      next: () => this.reloadExceptions(),
      error: err => console.error('Error al eliminar excepción:', err)
    });
  }

  // ------ Reset ------
  resetForm() {
    this.selectedUser = null;
    this.selectedDocument = null;
    this.permissions = { visualizar: false, editar: false, firmar: false };
    this.reason = '';
    this.userSearchTerm = '';
    this.documentSearchTerm = '';
    this.filteredUsers = this.users.slice();
    this.filterDocuments();
  }
}

