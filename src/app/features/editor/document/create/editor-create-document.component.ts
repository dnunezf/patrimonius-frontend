import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { DocumentService } from '../../../../../core/services/document.service';
import { TemplateSelectorComponent } from '../template/template-selector.component';
import { PlantillaModel } from '../../../../../core/services/plantilla.service';
import { CreateOptionDialogComponent } from './create-option-dialog.component';
import { ExceptionPermission, AccessExceptionService } from '../../../../../core/services/access-exception.service';

type UiUser = { id: number; email: string; fullName: string; rol: string };
type DocumentParticipant = {
  user: UiUser;
  permissions: { visualizar: boolean; editar: boolean; firmar: boolean };
};

@Component({
  standalone: true,
  selector: 'app-editor-create-document',
  imports: [CommonModule, FormsModule, TemplateSelectorComponent, CreateOptionDialogComponent],
  templateUrl: './editor-create-document.component.html',
  styleUrls: ['./editor-create-document.component.css'],
})

export class EditorCreateDocumentComponent implements OnInit {
  titulo = '';
  loading = false;
  error = '';
  fecha = new Date();
  usuarioEmail = '';

  // ✅ Nuevos estados para modales
  showTemplateSelector = false;
  showOptionDialog = false;
  plantillaSeleccionada: PlantillaModel | null = null;
  selectedAccessLevel: 'PUBLIC' | 'RESTRICTED' = 'PUBLIC';

  // ✅ User selection properties
  users: UiUser[] = [];
  filteredUsers: UiUser[] = [];
  userSearchTerm = '';
  showUserDropdown = false;
  
  // ✅ Document participants
  selectedParticipants: DocumentParticipant[] = [];

  constructor(
    private docs: DocumentService, 
    private router: Router,
    private http: HttpClient,
    private accessExceptionService: AccessExceptionService
  ) {}

  ngOnInit(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      this.usuarioEmail = user.email || 'usuario@patrimonius.mncr';
    } else {
      this.usuarioEmail = 'usuario@patrimonius.mncr';
    }
    
    // Load users for participant selection
    this.loadUsers();
  }

  private toUpperValue(value: string | null | undefined): string {
    return String(value || '').toUpperCase();
  }

  onTituloInput(): void {
    this.titulo = this.toUpperValue(this.titulo);
  }

  // ✅ Crear documento (abrir modal de opciones)
  crear(): void {
    this.error = '';
    this.titulo = this.toUpperValue(this.titulo).trim();

    if (!this.titulo) {
      this.error = 'Debe ingresar un título para el documento';
      return;
    }

    this.showOptionDialog = true; // mostrar modal de opciones
  }

  // ✅ Recibir la elección del modal
  onOptionSelected(option: 'plantilla' | 'sin' | 'cancelar') {
    this.showOptionDialog = false;

    if (option === 'plantilla') {
      this.showTemplateSelector = true; // abrir selector de plantillas
    } else if (option === 'sin') {
      this.crearDocumento(null); // sin plantilla: contenido vacío en backend
    } else {
      this.cancelar(); // volver al dashboard
    }
  }

  // ✅ Evento cuando selecciona una plantilla
  onTemplateSelected(p: PlantillaModel | null) {
    this.showTemplateSelector = false;
    if (p) {
      this.plantillaSeleccionada = p;
      this.crearDocumento(p.id);
    }
  }

  cancelar(): void {
    this.showTemplateSelector = false;
    this.showOptionDialog = false;
    this.router.navigate(['/editor/dashboard']);
  }

  // =======================
  // User loading methods
  // =======================
  private loadUsers() {
    const usersUrl = `${environment.apiUrl}/users/signers`;
    
    this.http.get<any[]>(usersUrl).subscribe({
      next: (users: any[]) => {
        this.users = (users || []).map((u: any) => ({
          id: Number(u.id),
          email: String(u.email || ''),
          rol: String(u.rol || ''),
          fullName: `${u.nombre ?? ''} ${u.apellido1 ?? ''} ${u.apellido2 ?? ''}`.trim()
        }));

        this.filteredUsers = this.users.slice();
      },
      error: (err: any) => {


        this.users = [];
        this.filteredUsers = [];
      }
    });
  }

  // =======================
  // User selection methods
  // =======================
  onUserSearchInput(): void {
    this.userSearchTerm = this.userSearchTerm; // Don't convert to uppercase for search
    this.filterUsers();
    this.showUserDropdown = true; // Always show dropdown when typing or focusing
  }

  onUserSearchFocus(): void {
    // Show all available users when focusing
    this.filterUsers();
    this.showUserDropdown = true;
  }

  filterUsers() {
    const q = this.userSearchTerm.toLowerCase();

    this.filteredUsers = this.users.filter(u => {
      const matchQ = !q || (u.fullName + ' ' + u.email).toLowerCase().includes(q);
      // Exclude already selected users
      const notSelected = !this.selectedParticipants.some(p => p.user.id === u.id);
      return matchQ && notSelected;
    });


  }

  selectUser(user: UiUser): void {
    
    // Check if user is already added
    const existingIndex = this.selectedParticipants.findIndex(
      p => p.user.id === user.id
    );
    
    if (existingIndex >= 0) {
      this.error = 'El usuario ya está en la lista de participantes';
      return;
    }
    
    // Add new participant with default permissions
    this.selectedParticipants.push({
      user: user,
      permissions: { visualizar: true, editar: false, firmar: false }
    });
    
    // Reset search
    this.userSearchTerm = '';
    this.showUserDropdown = false;
    this.error = '';

  }

  closeUserDropdown(): void {
    this.showUserDropdown = false;
  }

  showAllUsers(): void {
    this.userSearchTerm = '';
    this.filterUsers();
    this.showUserDropdown = true;
  }

  removeParticipant(index: number): void {
    this.selectedParticipants.splice(index, 1);
  }

  toggleParticipantPermission(index: number, permission: 'visualizar' | 'editar' | 'firmar'): void {
    this.selectedParticipants[index].permissions[permission] = !this.selectedParticipants[index].permissions[permission];
  }

  // Update document creation to include participants
  private crearDocumento(plantillaId: number | null): void {
    this.loading = true;
    const body: Parameters<DocumentService['crearDesdePlantilla']>[0] = {
      titulo: this.toUpperValue(this.titulo).trim(),
      confid_level: this.selectedAccessLevel,
    };
    
    if (plantillaId != null) {
      body.plantilla_id = plantillaId;
    }
    
    // Step 1: Create the document first
    this.docs
      .crearDesdePlantilla(body)
      .subscribe({
        next: async (res) => {
          // Temporarily disabled: Apply access exceptions requires admin privileges
            // TODO: Implement user-friendly permission sharing endpoint
            // if (this.selectedParticipants.length > 0) {
            //   await this.applyAccessExceptions(res.documento_id, this.selectedParticipants);
            // }
            
            this.loading = false;
            this.router.navigate(['/editor/document', res.documento_id, 'edit']);
        },
        error: (err: any) => {
          this.loading = false;
          this.error = err?.error?.message || 'No se pudo crear el documento';
        },
      });
  }

  private getParticipantPermissionsApi(permissions: { visualizar: boolean; editar: boolean; firmar: boolean }): ExceptionPermission[] {
    const perms: ExceptionPermission[] = [];
    if (permissions.visualizar) perms.push('VIEW');
    if (permissions.editar) perms.push('EDIT');
    if (permissions.firmar) perms.push('SIGN');
    return perms;
  }

  // =======================
  // Access Exception Logic (from access-exceptions.component.ts)
  // =======================
  private docEstadoRaw(doc: any | null): string {
    return String(doc?.estado ?? '').toUpperCase();
  }

  private puedeEditarPorEstado(doc: any | null): boolean {
    const s = this.docEstadoRaw(doc);
    return s === 'CREACION' || s === 'EDICION';
  }

  private puedeFirmarPorEstado(doc: any | null): boolean {
    const s = this.docEstadoRaw(doc);
    return s === 'CREACION' || s === 'EDICION';
  }

  private validateParticipantPermissions(participant: DocumentParticipant): boolean {
    const perms = participant.permissions;
    // For new documents being created, we assume CREACION state
    if (perms.editar && !this.puedeEditarPorEstado({ estado: 'CREACION' })) {
      return false;
    }
    if (perms.firmar && !this.puedeFirmarPorEstado({ estado: 'CREACION' })) {
      return false;
    }
    return true;
  }

  private applyAccessExceptions(documentId: number, participants: DocumentParticipant[]): Promise<void> {
    const promises = participants.map(participant => {
      if (!this.validateParticipantPermissions(participant)) {
        throw new Error(`Permisos inválidos para el usuario ${participant.user.fullName}`);
      }

      const payload = {
        userId: participant.user.id,
        documentId: documentId,
        permissions: this.getParticipantPermissionsApi(participant.permissions),
        reason: 'ACCESO AUTOMÁTICO AL CREAR DOCUMENTO'
      };

      return this.accessExceptionService.applyException(payload).toPromise();
    });

    return Promise.all(promises).then(() => {});
  }
}
