import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AccessExceptionService } from '../../../../core/services/access-exception.service';
import { CategoriaService } from '../../../../core/services/categoria.service';
import { AuditService } from '../../../../core/services/audit.service';

@Component({
  selector: 'app-access-exceptions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './access-exceptions.component.html',
  styleUrls: ['./access-exceptions.component.css'],
  providers: [DatePipe]

})
export class AccessExceptionsComponent implements OnInit {
  // Variables para categorías
  categoriaSearchTerm: string = ''; // Término de búsqueda
  categorias: any[] = []; // Lista de categorías
  selectedCategoria: string = 'todos'; // Valor predeterminado de categoría seleccionada

  // Variables para estados
  selectedDocumentStatus: string = 'todos';
  states: string[] = [];

  // Variables para usuarios
  userSearchTerm: string = '';
  selectedUser: any = null;
  selectedRole: string = 'todos';
  roles: string[] = [];
  users: any[] = [];

  // Variables para el formulario
  documentSearchTerm: string = '';
  selectedDocument: any = null;
  reason: string = '';
  permissions: { [key in 'visualizar' | 'editar' | 'firmar']: boolean } = {
    visualizar: false,
    editar: false,
    firmar: false,
  };

  selectedDocumentType: string = 'todos';

  activeExceptions: any[] = [];
  filteredUsers: any[] = [];
  filteredDocuments = [];

  constructor(
    private accessExceptionService: AccessExceptionService,
    private datePipe: DatePipe,
    private categoriaService: CategoriaService,
    private auditService: AuditService
  ) {}

  ngOnInit() {
    // Cargar roles desde el backend
    this.accessExceptionService.getRoles().subscribe({
      next: (roles) => {
        this.roles = roles.map(role =>
          role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase()) // Convierte a "proper case"
        );
      },
      error: (err) => {
        console.error('Error al cargar roles:', err);
        this.roles = [];  // Si ocurre un error, solo usamos el valor por defecto
      },
    });

    // Cargar usuarios desde el backend
    this.accessExceptionService.getUsers().subscribe({
      next: (users) => {
        this.users = users.map(user => ({
          ...user,
          fullName: `${user.nombre} ${user.apellido1} ${user.apellido2} (${user.rol.replace(/_/g, ' ').toLowerCase()})` // Reemplazamos los _ por espacios
        }));
        this.filteredUsers = this.users; // Inicializamos los usuarios filtrados
      },
      error: (err) => {
        console.error('Error al cargar usuarios:', err);
        this.users = []; // Si ocurre un error, no hay usuarios
        this.filteredUsers = [];  // Inicializamos la lista de usuarios filtrados
      },
    });

    // Cargar categorías desde el backend
    this.categoriaService.getCategorias().subscribe({
      next: (categorias) => {
        this.categorias = categorias.map(categoria => ({
          ...categoria,
          nombre: categoria.nombre.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char: string) => char.toUpperCase()) // Normalizamos la categoría
        }));
      },
      error: (err) => {
        console.error('Error al cargar categorías:', err);
        this.categorias = [];  // Si ocurre un error, dejamos la lista vacía
      },
    });

    // Cargar estados desde el backend
    this.auditService.getDocumentStates().subscribe({
      next: (states) => {
        console.log('Estados cargados correctamente:', states); // Verificar que lleguen bien
        this.states = states.map((state: string) =>
          state
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (char: string) => char.toUpperCase())
        );
      },
      error: (err) => {
        console.error('Error al cargar estados:', err);
        this.states = [];
      }
    });
  }

  // Función para filtrar categorías
  filterCategorias() {
    return this.categorias.filter(categoria =>
      categoria.nombre.toLowerCase().includes(this.categoriaSearchTerm.toLowerCase()) ||
      this.selectedCategoria === 'todos'
    );
  }

  // Función para filtrar los usuarios según la búsqueda y el rol seleccionado
  filterUsers() {
    const selectedRoleNormalized = this.selectedRole === 'todos' ? 'todos' : this.selectedRole.replace(/ /g, '_').toLowerCase();
    this.filteredUsers = this.users.filter(
      (user) =>
        (user.fullName.toLowerCase().includes(this.userSearchTerm.toLowerCase()) || user.email.toLowerCase().includes(this.userSearchTerm.toLowerCase())) &&
        (selectedRoleNormalized === 'todos' || user.rol.toLowerCase().replace(/ /g, '_') === selectedRoleNormalized)
    );
  }

  // // Función para filtrar los documentos según la búsqueda
  // filterDocuments() {
  //   this.filteredDocuments = this.documents.filter(
  //     (doc) =>
  //       doc.title.toLowerCase().includes(this.documentSearchTerm.toLowerCase()) &&
  //       (this.selectedDocumentType === 'todos' || this.getDocumentType(doc) === this.selectedDocumentType) &&
  //       (this.selectedDocumentStatus === 'todos' || doc.status === this.selectedDocumentStatus)
  //   );
  // }
  // filterDocuments() {
  //   this.filteredDocuments = this.documents.filter(
  //     (doc) =>
  //       doc.title.toLowerCase().includes(this.documentSearchTerm.toLowerCase()) &&
  //       (this.selectedDocumentType === 'todos' || this.getDocumentType(doc) === this.selectedDocumentType) &&
  //       (this.selectedDocumentStatus === 'todos' || doc.status === this.selectedDocumentStatus)
  //   );
  // }


  // Método para comprobar si el formulario es válido
  isFormValid(): boolean {
    const permisosSeleccionados =
      this.permissions.visualizar || this.permissions.editar || this.permissions.firmar;

    const documentoLleno = this.selectedDocument || this.documentSearchTerm;
    const usuarioLleno = this.selectedUser || this.userSearchTerm;
    const motivoLleno = this.reason.trim().length > 0 || true;

    return permisosSeleccionados && (documentoLleno || usuarioLleno);
  }

  // // Método para asignar un tipo de documento según el título
  // getDocumentType(doc: any): string {
  //   if (doc.title.includes('Acta')) return 'Acta';
  //   if (doc.title.includes('Informe')) return 'Informe';
  //   if (doc.title.includes('Protocolo')) return 'Protocolo';
  //   if (doc.title.includes('Presupuesto')) return 'Presupuesto';
  //   if (doc.title.includes('Manual')) return 'Manual';
  //   if (doc.title.includes('Investigación')) return 'Investigación';
  //   return 'Otros'; // Caso por defecto
  // }

  // Método para seleccionar un usuario
  selectUser(user: any) {
    this.selectedUser = user;
    this.userSearchTerm = user.name;
  }

  // Método para manejar el cambio de estado de un permiso
  togglePermission(permission: 'visualizar' | 'editar' | 'firmar') {
    this.permissions[permission] = !this.permissions[permission];
  }

  // Método para obtener los permisos seleccionados
  getSelectedPermissions(): string {
    let selectedPermissions = [];
    if (this.permissions.visualizar) selectedPermissions.push('Visualizar');
    if (this.permissions.editar) selectedPermissions.push('Editar');
    if (this.permissions.firmar) selectedPermissions.push('Firmar');
    return selectedPermissions.join(', ') || '';
  }

  // Método para aplicar la excepción
  applyException() {
    if (this.isFormValid()) {
      const exception = {
        user: this.selectedUser.fullName,
        document: this.selectedDocument.title,
        permission: this.getSelectedPermissions(),
        date: new Date().toLocaleDateString(),
      };

      this.activeExceptions.push(exception);
      localStorage.setItem('activeExceptions', JSON.stringify(this.activeExceptions)); // Guardar en localStorage
      localStorage.setItem('selectedUser', JSON.stringify(this.selectedUser));
      localStorage.setItem('selectedDocument', JSON.stringify(this.selectedDocument));
      localStorage.setItem('permissions', JSON.stringify(this.permissions));
      localStorage.setItem('reason', this.reason);

      this.resetForm(); // Reiniciar el formulario
    }
  }

  // Método para reiniciar el formulario
  resetForm() {
    this.selectedUser = null;
    this.selectedDocument = null;
    this.permissions = { visualizar: false, editar: false, firmar: false };
    this.reason = '';
    this.userSearchTerm = '';
    this.documentSearchTerm = '';
    this.filteredUsers = this.users;
    this.filteredDocuments = [];
  }

  // Método para eliminar una excepción activa
  deleteException(exception: any) {
    const index = this.activeExceptions.indexOf(exception);
    if (index > -1) {
      this.activeExceptions.splice(index, 1);
    }
  }
}
