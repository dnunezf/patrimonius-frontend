import { Component } from '@angular/core';
import { CommonModule, NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

type SubLink = { label: string; route: string };

type Submodule = {
  title: string;
  desc: string;
  status: 'available' | 'wip'; // Aquí dejamos el campo de "status" para manejar el estado de cada módulo
  link?: string; // Ruta principal del módulo (cuando es solo un enlace)
  links?: SubLink[]; // Lista de enlaces para submódulos (por ejemplo, Roles, Unidades, etc.)
  bullets: string[]; // Funciones principales
  statsValue?: string; // Para mostrar información adicional como cantidad de registros, si es necesario
  icon?: string;
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
      statsValue: '47 usuarios activos',
      icon: 'users',
    },
    {
      title: 'Gestión de Catálogos',
      desc: 'Administrar catálogos de Roles, Unidades Organizacionales y Plantillas.',
      status: 'available',
      links: [
        { label: 'Roles', route: '/admin/catalogos/roles' },
        { label: 'Unidades', route: '/admin/catalogos/unidades' },
        { label: 'Plantillas', route: '/admin/catalogos/plantillas' },
      ],
      bullets: ['Roles', 'Unidades organizacionales', 'Plantillas'],
      statsValue: '3 catálogos disponibles',
      icon: 'catalogo',
    },
    {
      title: 'Control de Acceso por Confidencialidad',
      desc: 'Configurar niveles de confidencialidad y restricciones por documento.',
      status: 'available',
      link: '/admin/confidentiality',
      bullets: ['Niveles de confidencialidad', 'Restricciones por documento', 'Políticas de acceso'],
      icon: 'confidencialidad',
    },
    {
      title: 'Acceso por Excepciones',
      desc: 'Gestionar excepciones en el acceso a documentos.',
      status: 'available',
      link: '/admin/access-exceptions',
      bullets: ['Configurar excepciones', 'Asignar permisos', 'Definir roles específicos'],
      icon: 'excepciones',
    },
    {
      title: 'Acceso por Unidad Organizacional',
      desc: 'Control de permisos basado en la estructura organizacional del Museo Nacional.',
      status: 'available',
      link: '/admin/access-control',
      bullets: ['Permisos por unidad', 'Estructura organizacional', 'Acceso granular'],
      icon: 'unidades',
    },
  ];
}
