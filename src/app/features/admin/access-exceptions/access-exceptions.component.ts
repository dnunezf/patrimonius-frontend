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
  // Variables para documentos
  documents: any[] = [];  // Lista de documentos
  selectedDocument: {
    titulo: string;
    numero_serie: string;
    estado: string;
    categoria: string;
    fecha: string;
  } | null = null;

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
  //selectedDocument: any = null;
  reason: string = '';
  permissions: { [key in 'visualizar' | 'editar' | 'firmar']: boolean } = {
    visualizar: false,
    editar: false,
    firmar: false,
  };

  activeExceptions: any[] = [];
  filteredUsers: any[] = [];
  filteredDocuments: any[] = [];

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
        console.log('Categorías recibidas desde el backend:', categorias); // Check categories here
        this.categorias = categorias;
        this.loadDocuments(); // Load documents after categories are fetched
      },
      error: (err) => {
        console.error('Error al cargar categorías:', err);
        this.categorias = [];
      }
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

    // Cargar documentos desde el backend
    this.accessExceptionService.getDocuments().subscribe({
      next: (documents) => {
        console.log('Documentos cargados:', documents);
        this.documents = documents.map(doc => {
          const categoria = this.categorias.find(cat => cat.id === doc.categoria_id);
          return {
            ...doc,
            categoria: categoria ? categoria.nombre : 'Sin categoría',
            numero_serie: doc.numero_serie, // Asegúrate de que esto esté presente
          };
        });
        this.filterDocuments(); // Filtra después de cargar los documentos
      },
      error: (err) => {
        console.error('Error al cargar documentos:', err);
        this.documents = [];
      }
    });

    // Cargar excepciones activas desde localStorage
    const storedExceptions = localStorage.getItem('activeExceptions');
    if (storedExceptions) {
      this.activeExceptions = JSON.parse(storedExceptions);
      console.log('Excepciones activas cargadas:', this.activeExceptions); // Verificar que lleguen bien
    }

  }

  // Función para filtrar categorías
  filterCategorias() {
    return this.categorias.filter(categoria =>
      categoria.nombre.toLowerCase().includes(this.categoriaSearchTerm.toLowerCase()) ||
      this.selectedCategoria === 'todos'
    );
  }

// Función para cargar documentos después de cargar categorías
  loadDocuments() {
    this.accessExceptionService.getDocuments().subscribe({
      next: (documents) => {
        console.log("Documentos recibidos:", documents);
        this.documents = documents.map(doc => {

          return {
            ...doc,
            categoria: this.formatCategory(doc.categoria),
            formattedDate: this.formatDate(doc.fecha),
            formattedState: this.formatState(doc.estado),
          };
        });
        this.filterDocuments(); // Filtra después de cargar los documentos
      },
      error: (err) => {
        console.error('Error al cargar documentos:', err);
        this.documents = [];  // Si ocurre un error, dejamos la lista vacía
      }
    });
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

  // Función para filtrar documentos por estado y categoría
  filterDocuments() {
    this.filteredDocuments = this.documents.filter((doc) => {
      const categoriaToCompare = this.selectedCategoria === 'todos' ? '' : this.selectedCategoria.toLowerCase();
      const documentCategory = doc.categoria ? doc.categoria.toLowerCase() : 'sin categoría';

      return (
        doc.titulo.toLowerCase().includes(this.documentSearchTerm.toLowerCase()) && // Filter by title
        (categoriaToCompare === '' || documentCategory.includes(categoriaToCompare)) && // Filter by category
        (this.selectedDocumentStatus === 'todos' || doc.estado.toLowerCase() === this.selectedDocumentStatus.toLowerCase()) // Filter by state
      );
    });
  }



  formatState(state: string): string {
    return state.charAt(0).toUpperCase() + state.slice(1).toLowerCase();
  }

  formatCategory(category: string): string {
    return category
      .toLowerCase() // Convert to lowercase
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/\b\w/g, char => char.toUpperCase()); // Capitalize the first letter of each word
  }

  formatDate(date: string): string {
    const dateObj = new Date(date);
    return `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
  }



  // Método para comprobar si el formulario es válido
  isFormValid(): boolean {
    const permisosSeleccionados =
      this.permissions.visualizar || this.permissions.editar || this.permissions.firmar;

    const documentoLleno = this.selectedDocument || this.documentSearchTerm;
    const usuarioLleno = this.selectedUser || this.userSearchTerm;
    const motivoLleno = this.reason.trim().length > 0 || true;

    return permisosSeleccionados && (documentoLleno || usuarioLleno);
  }




  // Método para seleccionar un usuario
  selectUser(user: any) {
    this.selectedUser = user;
    this.userSearchTerm = user.name;
  }

  // Método para manejar el cambio de estado de un permiso
  togglePermission(permission: 'visualizar' | 'editar' | 'firmar') {
    this.permissions[permission] = !this.permissions[permission];
    // Manually trigger the class toggle for styling
    const button = document.querySelector(`button[data-permission="${permission}"]`);
    button?.classList.toggle('selected', this.permissions[permission]);
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
        email: this.selectedUser.email,  // Aquí agregamos el correo
        document: this.selectedDocument?.titulo,
        documentNumber: this.selectedDocument?.numero_serie, // Número de serie
        permission: this.getSelectedPermissions(),
        reason: this.reason,
        date: new Date().toLocaleDateString(),
      };

      // Agregar a las excepciones activas
      this.activeExceptions.push(exception);

      // Guardar en localStorage
      localStorage.setItem('activeExceptions', JSON.stringify(this.activeExceptions));

      // Limpiar formulario
      this.resetForm();
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
    this.filteredUsers = this.users; // Reset the user list to its original state
    this.filteredDocuments = []; // Reset filtered documents
  }


  // Método para eliminar una excepción activa
  deleteException(exception: any) {
    // Eliminar la excepción de activeExceptions
    const index = this.activeExceptions.indexOf(exception);
    if (index > -1) {
      this.activeExceptions.splice(index, 1);
    }

    // Guardar el estado actualizado en localStorage
    localStorage.setItem('activeExceptions', JSON.stringify(this.activeExceptions));
  }

}
