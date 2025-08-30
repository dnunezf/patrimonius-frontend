import { Component } from '@angular/core';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [NgFor],
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
      icon: 'docs',
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
      icon: 'clock',
    },
  ];
  moduleCards = [
    {
      title: 'Módulo de Administración',
      description:
        'Gestión de usuarios y accesos por confidencialidad y unidad.',
      status: 'available',
      statsLabel: 'Estado',
      statsValue: 'HU-001 + HU-002 Completo',
      features: [
        'Gestionar usuarios',
        'Control de accesos',
        'Acceso organizacional',
      ],
      icon: 'gear',
    },
    {
      title: 'Carga de Documentos',
      description: 'Carga individual y masiva con validación.',
      status: 'wip',
      statsLabel: 'Estado',
      statsValue: '1847 documentos',
      features: ['Carga individual', 'Carga masiva', 'Validar formatos'],
      icon: 'upload',
    },
    {
      title: 'Gestión de Paquetes SIP',
      description: 'Generar y transferir paquetes al AN.',
      status: 'wip',
      statsLabel: 'Estado',
      statsValue: '12 paquetes',
      features: ['Generar SIP', 'Validar OAIS', 'Transferir al AN'],
      icon: 'cube',
    },
    {
      title: 'Gestión de Disposiciones',
      description: 'Control de plazos de conservación y eliminación.',
      status: 'wip',
      statsLabel: 'Estudios',
      statsValue: '156 evaluaciones',
      features: [
        'Asignar plazos',
        'Alertas automáticas',
        'Evaluar eliminación',
      ],
      icon: 'calendar',
    },
    {
      title: 'Consultas de Bitácoras',
      description: 'Auditoría completa y exportación.',
      status: 'available',
      statsLabel: 'Estado',
      statsValue: '1,234 eventos',
      features: ['Filtrar eventos', 'Exportar XML', 'Análisis gráfico'],
      icon: 'activity',
    },
  ];
}
