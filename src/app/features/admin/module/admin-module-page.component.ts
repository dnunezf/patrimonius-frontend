import { Component } from '@angular/core';
import { CommonModule, NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';

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
    // Otros submódulos se agregan en HU futuras
  ];
}
