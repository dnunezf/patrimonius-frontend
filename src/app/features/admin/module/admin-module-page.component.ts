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
  imports: [CommonModule, NgFor, RouterLink, FormsModule],
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
      title: 'Control de Acceso por Confidencialidad',
      desc: 'Configurar niveles de confidencialidad y restricciones por documento.',
      status: 'available',
      link: '/admin/confidentiality', // << route to HU-002 page
      bullets: [
        'Niveles de confidencialidad',
        'Restricciones por documento',
        'Políticas de acceso',
      ],
    },
    {
      title: 'Acceso por Excepciones',
      desc: 'Gestionar excepciones en el acceso a documentos.',
      status: 'available',
      link: '/admin/access-exceptions',
      bullets: [
        'Configurar excepciones',
        'Asignar permisos',
        'Definir roles específicos',
      ],
    },
  ];
}
