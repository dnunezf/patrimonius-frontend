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
  statCards = [
    {
      label: 'Usuarios Totales',
      value: 47,
      subtitle: '23 activos',
      icon: 'users',
    },
    {
      label: 'Documentos',
      value: 1847,
      subtitle: 'En el sistema',
      icon: 'document-create',
    },
    {
      label: 'Transferencias Pendientes',
      value: 8,
      subtitle: 'al Archivo Nacional',
      icon: 'box',
    },
    {
      label: 'Alertas de Retención',
      value: 156,
      subtitle: 'Requieren evaluación',
      icon: 'clock-three',
    },
  ];

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
      status: 'wip',
      features: ['Carga individual', 'Carga masiva', 'Validar formatos'],
      icon: 'upload',
    },
    {
      title: 'Gestión de Paquetes SIP',
      description: 'Generar y transferir paquetes al AN.',
      status: 'wip',
      features: ['Generar SIP', 'Validar OAIS', 'Transferir al AN'],
      icon: 'paquete',
    },
    {
      title: 'Gestión de Disposiciones',
      description: 'Control de plazos de conservación y eliminación.',
      status: 'wip',
      features: [
        'Asignar plazos',
        'Alertas automáticas',
        'Evaluar eliminación',
      ],
      icon: 'plazos',
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
