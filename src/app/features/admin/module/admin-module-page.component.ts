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
      status: 'available', // El módulo está disponible
      link: '/admin/users', // Enlace directo al módulo
      bullets: ['Crear usuarios', 'Asignar roles', 'Gestionar permisos'], // Funciones principales
      statsValue: '47 usuarios activos', // Información adicional que se mostrará
    },

    {
      title: 'Gestión de Catálogos',
      desc: 'Administrar catálogos de Roles, Unidades Organizacionales y Plantillas.',
      status: 'available', // Módulo disponible
      links: [ // Varios enlaces que redirigen a las respectivas páginas
        { label: 'Roles', route: '/admin/catalogos/roles' },
        { label: 'Unidades', route: '/admin/catalogos/unidades' },
        { label: 'Plantillas', route: '/admin/catalogos/plantillas' },
      ],
      bullets: ['Roles', 'Unidades organizacionales', 'Plantillas'], // Funciones principales
      statsValue: '3 catálogos disponibles', // Información adicional
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

    {
      title: 'Acceso por Unidad Organizacional',
      desc: 'Control de permisos basado en la estructura organizacional del Museo Nacional.',
      status: 'available',
      link: '/admin/access-control',
      bullets: ['Permisos por unidad', 'Estructura organizacional', 'Acceso granular'],
    },

    {
      title: 'Permisos del Editor',
      desc: 'Configurar y aplicar permisos EDIT y SIGN para el rol de Editor.',
      status: 'available', // Módulo disponible
      link: '/admin/permisos-editor', // Enlace directo al módulo
      bullets: ['Configurar EDIT y SIGN', 'Aplicación automática', 'Auditar cambios'], // Funciones principales
      statsValue: '2 permisos configurados', // Información adicional
    },
  ];
}
