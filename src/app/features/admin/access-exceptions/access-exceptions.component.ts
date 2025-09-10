import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Location } from '@angular/common';

@Component({
  selector: 'app-access-exceptions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './access-exceptions.component.html',
  styleUrls: ['./access-exceptions.component.css'],
  providers: [DatePipe]

})
export class AccessExceptionsComponent {
  constructor(
    private datePipe: DatePipe,
    private location: Location) {}

  // Variables para el formulario
  userSearchTerm: string = '';
  documentSearchTerm: string = '';
  selectedUser: any = null;
  selectedDocument: any = null;
  reason: string = '';
  permissions: { [key in 'visualizar' | 'editar' | 'firmar']: boolean } = {
    visualizar: false,
    editar: false,
    firmar: false
  };
  selectedRole: string = 'todos';
  selectedDocumentType: string = 'todos';
  selectedDocumentStatus: string = 'todos';

  // Datos de ejemplo
  users = [
    { id: 1, name: 'Carlos Rodríguez', role: 'Editor' },
    { id: 2, name: 'Ana Gómez', role: 'Administrador' },
    { id: 3, name: 'Luis Fernández', role: 'Archivista' },
  ];

  documents = [
    { id: 1, title: 'Acta de Junta Directiva', status: 'En proceso' },
    { id: 2, title: 'Manual de Procedimientos', status: 'Archivado' },
    { id: 3, title: 'Informe Anual 2024', status: 'En proceso' },
  ];

  // Excepciones activas (simuladas)
  activeExceptions = [
    { user: 'Carlos Rodríguez', document: 'Acta de Junta Directiva', permission: 'Firmar', date: '2025-01-25' },
    { user: 'Ana Gómez', document: 'Manual de Procedimientos', permission: 'Editar', date: '2025-01-24' }
  ];

  filteredUsers = this.users;
  filteredDocuments = this.documents;

  // Función para filtrar los usuarios según la búsqueda
  filterUsers() {
    this.filteredUsers = this.users.filter(user =>
      user.name.toLowerCase().includes(this.userSearchTerm.toLowerCase()) &&
      (this.selectedRole === 'todos' || user.role === this.selectedRole)
    );
  }

  // Función para filtrar los documentos según la búsqueda
  filterDocuments() {
    this.filteredDocuments = this.documents.filter(doc =>
      doc.title.toLowerCase().includes(this.documentSearchTerm.toLowerCase()) &&
      (this.selectedDocumentType === 'todos' || this.getDocumentType(doc) === this.selectedDocumentType) &&
      (this.selectedDocumentStatus === 'todos' || doc.status === this.selectedDocumentStatus)
    );
  }

  // Método para comprobar si el formulario es válido
  isFormValid(): boolean {
    // Verificamos que haya al menos un permiso seleccionado
    const permisosSeleccionados = this.permissions.visualizar || this.permissions.editar || this.permissions.firmar;

    // Verificar que al menos uno de los campos clave esté lleno
    const documentoLleno = this.selectedDocument || this.documentSearchTerm;
    const usuarioLleno = this.selectedUser || this.userSearchTerm;
    const motivoLleno = this.reason.trim().length > 0 || true;

    // Validación de formulario
    return permisosSeleccionados && (documentoLleno || usuarioLleno);
  }

  // Método que asigna un tipo de documento según el título
  getDocumentType(doc: any): string {
    // Aquí deberías definir la lógica para asignar un tipo basado en el título del documento
    if (doc.title.includes('Acta')) return 'Acta';
    if (doc.title.includes('Informe')) return 'Informe';
    if (doc.title.includes('Protocolo')) return 'Protocolo';
    if (doc.title.includes('Presupuesto')) return 'Presupuesto';
    if (doc.title.includes('Manual')) return 'Manual';
    if (doc.title.includes('Investigación')) return 'Investigación';
    return 'Otros'; // Caso por defecto
  }

  // Método para seleccionar un usuario
  selectUser(user: any) {
    this.selectedUser = user;
    this.userSearchTerm = user.name;  // Muestra el nombre seleccionado en el input
  }

  // Método para seleccionar un documento
  selectDocument(doc: any) {
    this.selectedDocument = doc;
    this.documentSearchTerm = doc.title;  // Muestra el título seleccionado en el input
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
      const formattedDate = this.datePipe.transform(new Date(), 'dd-MM-yyyy');
      const exception = {
        user: this.selectedUser.name,
        document: this.selectedDocument.title,
        permission: this.getSelectedPermissions(),
        date: new Date().toLocaleDateString()
      };

      // Guardar las excepciones activas en localStorage
      this.activeExceptions.push(exception);
      localStorage.setItem('activeExceptions', JSON.stringify(this.activeExceptions)); // Guardar en localStorage

      // Guardar otros datos del formulario
      localStorage.setItem('selectedUser', JSON.stringify(this.selectedUser));
      localStorage.setItem('selectedDocument', JSON.stringify(this.selectedDocument));
      localStorage.setItem('permissions', JSON.stringify(this.permissions));
      localStorage.setItem('reason', this.reason);

      this.resetForm(); // Reiniciar el formulario
    }
  }

  ngOnInit() {
    // Cargar datos desde localStorage si existen
    const savedUser = localStorage.getItem('selectedUser');
    const savedDocument = localStorage.getItem('selectedDocument');
    const savedPermissions = localStorage.getItem('permissions');
    const savedReason = localStorage.getItem('reason');
    const savedExceptions = localStorage.getItem('activeExceptions');

    if (savedUser) {
      this.selectedUser = JSON.parse(savedUser);
    }
    if (savedDocument) {
      this.selectedDocument = JSON.parse(savedDocument);
    }
    if (savedPermissions) {
      this.permissions = JSON.parse(savedPermissions);
    }
    if (savedReason) {
      this.reason = savedReason;
    }
    // Si existen excepciones activas guardadas en localStorage, cargarlas
    if (savedExceptions) {
      this.activeExceptions = JSON.parse(savedExceptions);
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
    this.filteredDocuments = this.documents;
  }

  // Método para eliminar una excepción activa
  deleteException(exception: any) {
    const index = this.activeExceptions.indexOf(exception);
    if (index > -1) {
      this.activeExceptions.splice(index, 1);
    }
  }

}
