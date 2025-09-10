import { Component } from '@angular/core';
import { CommonModule, NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';

type SubLink = { label: string; route: string };

type Submodule = {
  title: string;
  desc: string;
  status: 'available' | 'wip';
  /** Ruta principal (opcional). Si no hay, usar links[] */
  link?: string;
  /** Acciones directas (opcional): e.g. Roles, Unidades, Plantillas */
  links?: SubLink[];
  bullets: string[];
};

@Component({
  selector: 'app-admin-module-page',
  standalone: true,
  imports: [CommonModule, NgFor, RouterLink],
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

    // NUEVO: Gestión de Catálogos
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
    },

    // NUEVO: Permisos del Editor (HU-004)
    {
      title: 'Permisos del Editor',
      desc: 'Configurar y aplicar permisos EDIT y SIGN para el rol de Editor.',
      status: 'available',
      link: '/admin/permisos-editor',
      bullets: ['Configurar EDIT y SIGN', 'Aplicación automática', 'Auditar cambios'],
    },
  ];
}
