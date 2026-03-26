import { Component } from '@angular/core';
import { CommonModule, NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';

type SubLink = { label: string; route: string };
type Submodule = {
  title: string;
  desc: string;
  status: 'available' | 'wip';
  links?: SubLink[];
  bullets: string[];
  statsValue?: string;
  icon?: string;
};

@Component({
  selector: 'app-catalogos-module-page',
  standalone: true,
  imports: [CommonModule, NgFor, RouterLink],
  templateUrl: './catalogos-module-page.component.html',
  styleUrls: ['./catalogos-module-page.component.css'],
})
export class CatalogosModulePageComponent {
  submodules: Submodule[] = [
    {
      title: 'Roles',
      desc: 'Administrar catálogos de roles del sistema.',
      status: 'available',
      links: [{ label: 'Gestionar Roles', route: '/admin/module/catalogs/roles' }],
      bullets: [
        'Crear, editar y eliminar roles',
        'Asignar permisos',
        'Gestionar usuarios por rol'
      ],
      statsValue: '10 roles registrados',
      icon: 'roles',
    },
    {
      title: 'Unidades Organizacionales',
      desc: 'Gestionar unidades dentro de la organización.',
      status: 'available',
      links: [{ label: 'Gestionar Unidades', route: '/admin/module/catalogs/unidades' }],
      bullets: [
        'Agregar nuevas unidades',
        'Editar o eliminar unidades existentes'
      ],
      statsValue: '5 unidades registradas',
      icon: 'unidades',
    },
    {
      title: 'Plantillas',
      desc: 'Administrar plantillas para documentos y otros procesos.',
      status: 'available',
      links: [{ label: 'Gestionar Plantillas', route: '/admin/module/catalogs/plantillas' }],
      bullets: [
        'Crear plantillas',
        'Asignar plantillas a documentos'
      ],
      statsValue: '12 plantillas disponibles',
      icon: 'plantillas',
    },

    {
      title: 'Series',
      desc: 'Administrar las series archivísticas asociadas a las unidades organizacionales.',
      status: 'available',
      links: [{ label: 'Gestionar Series', route: '/admin/module/catalogs/series' }],
      bullets: [
        'Crear, editar y eliminar series',
        'Asociar series a unidades organizacionales',
        'Mantener la estructura archivística principal'
      ],
      statsValue: 'Catálogo archivístico',
      icon: 'series',
    },
    {
      title: 'Subseries',
      desc: 'Administrar las subseries archivísticas asociadas a cada serie.',
      status: 'available',
      links: [{ label: 'Gestionar Subseries', route: '/admin/module/catalogs/subseries' }],
      bullets: [
        'Crear, editar y eliminar subseries',
        'Asociar subseries a una serie específica',
        'Mantener subdivisiones archivísticas'
      ],
      statsValue: 'Catálogo archivístico',
      icon: 'subseries',
    },
    {
      title: 'Expedientes',
      desc: 'Administrar los expedientes donde se agrupan los documentos del sistema.',
      status: 'available',
      links: [{ label: 'Gestionar Expedientes', route: '/admin/module/catalogs/expedientes' }],
      bullets: [
        'Crear, editar y eliminar expedientes',
        'Relacionar expedientes con unidad, serie y subserie',
        'Gestionar carpetas documentales'
      ],
      statsValue: 'Gestión documental',
      icon: 'expedientes',
    },
  ];
}
