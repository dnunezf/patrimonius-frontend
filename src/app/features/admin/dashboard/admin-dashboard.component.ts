import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { RouterLink } from '@angular/router'; // Import RouterLink

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [NgFor, RouterLink, ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
})
export class AdminDashboardComponent {

  moduleCards = [
    {
      title: 'Módulo de Administración',
      description: 'Gestión de usuarios y accesos.',
      status: 'available',
      features: [
        'Gestionar usuarios',
        'Control de accesos',
        'Acceso organizacional',
      ],
      icon: 'admin',
      link: '/admin/module', // Solo una vez
    },
    {
      title: 'Carga de Documentos',
      description: 'Carga individual y masiva con validación.',
      status: 'available',
      features: ['Carga individual', 'Carga masiva', 'Validar formatos'],
      icon: 'upload',
      link: '/documentos/carga-masiva',
    },
    {
      title: 'Consultas de Bitácoras',
      description: 'Auditoría completa y exportación.',
      status: 'available',
      features: ['Filtrar eventos', 'Exportar XML', 'Análisis gráfico'],
      icon: 'auditoria',
      link: '/logs',
    },
  ];
}
