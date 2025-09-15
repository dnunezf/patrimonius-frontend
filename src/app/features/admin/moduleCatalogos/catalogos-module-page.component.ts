import { Component } from '@angular/core';
import { CommonModule, NgFor } from '@angular/common';
import {RouterLink, RouterOutlet} from '@angular/router';

type SubLink = { label: string; route: string };

type Submodule = {
  title: string;
  desc: string;
  status: 'available' | 'wip';
  links?: SubLink[];  // Links para los submódulos
  submodules?: SubLink[];  // Subenlaces dentro de los submódulos
  bullets: string[];
  statsValue?: string;
};

@Component({
  selector: 'app-catalogos-module-page',
  standalone: true,
  imports: [CommonModule, NgFor, RouterLink, RouterOutlet],
  templateUrl: './catalogos-module-page.component.html',
  styleUrls: ['./catalogos-module-page.component.css'],
})
export class CatalogosModulePageComponent {
  // Configuramos los submódulos de catálogos
  submodules: Submodule[] = [
    {
      title: 'Roles',
      desc: 'Administrar catálogos de roles del sistema.',
      status: 'available',
      links: [
        { label: 'Gestionar Roles', route: '/admin/module/catalogs/roles' },
      ],
      bullets: ['Crear, editar y eliminar roles', 'Asignar permisos', 'Gestionar usuarios por rol'],
      statsValue: '10 roles registrados',
    },
    {
      title: 'Unidades Organizacionales',
      desc: 'Gestionar unidades dentro de la organización.',
      status: 'available',
      links: [
        { label: 'Gestionar Unidades', route: '/admin/module/catalogs/unidades' },
      ],
      bullets: ['Agregar nuevas unidades', 'Editar o eliminar unidades existentes'],
      statsValue: '5 unidades registradas',
    },
    {
      title: 'Plantillas',
      desc: 'Administrar plantillas para documentos y otros procesos.',
      status: 'available',
      links: [
        { label: 'Gestionar Plantillas', route: '/admin/module/catalogs/plantillas' },
      ],
      bullets: ['Crear plantillas', 'Asignar plantillas a documentos'],
      statsValue: '12 plantillas disponibles',
    },
  ];

}
