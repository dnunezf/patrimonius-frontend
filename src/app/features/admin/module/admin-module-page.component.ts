import { Component } from '@angular/core';
import { CommonModule, NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

type Submodule = {
  title: string;
  desc: string;
  status: 'available' | 'wip';
  link?: string;
  bullets: string[];
};

@Component({
  selector: 'app-admin-module-page',
  standalone: true,
  imports: [CommonModule, NgFor, RouterLink,FormsModule],
  templateUrl: './admin-module-page.component.html',
  styleUrls: ['./admin-module-page.component.css'],
})
export class AdminModulePageComponent {
  submodules: Submodule[] = [
    {
      title: 'Gestión de Usuarios',
      desc: 'Administrar cuentas, roles y permisos básicos del sistema.',
      status: 'available',
      link: '/admin/users',
      bullets: ['Crear usuarios', 'Asignar roles', 'Gestionar permisos'],
    },
    {
      title: 'Acceso por Excepciones',  // Nueva entrada para "Acceso por Excepciones"
      desc: 'Gestionar excepciones en el acceso a documentos.',
      status: 'available',
      link: '/admin/access-exceptions',  // Ruta de acceso a excepciones
      bullets: ['Configurar excepciones', 'Asignar permisos', 'Definir roles específicos'],
    },
    // Otros submódulos se agregan en HU futuras
  ];
}
