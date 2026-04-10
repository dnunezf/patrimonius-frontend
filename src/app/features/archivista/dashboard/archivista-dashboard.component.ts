import { Component } from '@angular/core';
import { NgFor, NgClass } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-archivista-dashboard',
  standalone: true,
  imports: [NgFor, NgClass],
  templateUrl: './archivista-dashboard.component.html',
  styleUrls: ['./archivista-dashboard.component.css'],
})
export class ArchivistaDashboardComponent {
  constructor(private router: Router) {}

  statsCards = [
    {
      title: 'Documentos Recibidos',
      value: '1',
      subtitle: 'Pendientes de clasificación',
      icon: 'folder-open',
      iconClass: 'icon-blue',
    },
    {
      title: 'En Conservación',
      value: '1',
      subtitle: 'Conservación activa',
      icon: 'shield',
      iconClass: 'icon-green',
    },
    {
      title: 'Próximos a Disposición',
      value: '1',
      subtitle: 'Requieren evaluación',
      icon: 'clock',
      iconClass: 'icon-orange',
    },
    {
      title: 'Eventos de Auditoría',
      value: '3',
      subtitle: 'Registros totales',
      icon: 'activity',
      iconClass: 'icon-gray',
    },
  ];

  moduleCards = [
    {
      title: 'Clasificación Archivistica',
      description:
        'Modulo de visualización para la clasificación de documentos',
      badge: '1 pendientes',
      features: ['Crear Series y Subseries', 'Muestra la lista de Clasificaciones [Serie/Subserie/Expediente] existentes'],
      icon: 'folder-open',
      iconClass: 'soft-blue',
      link: '/archivista/clasificacion',
    },
    {
      title: 'Clasificación y Descripción (HU-022)',
      description:
        'Clasificar y describir archivísticamente con metadatos OAIS completos',
      badge: '1 por clasificar',
      features: ['Clasificar jerarquía', 'Completar metadatos', 'Validar OAIS'],
      icon: 'file-text',
      iconClass: 'soft-green',
      link: '/archivista/clasificacion',
    },
    {
      title: 'Seguimiento de Conservación (HU-031)',
      description:
        'Control de vigencia y disposición final de documentos archivados',
      badge: '10 documentos',
      features: ['Controlar vigencia', 'Gestionar alertas', 'Disposición final'],
      icon: 'clock',
      iconClass: 'soft-cyan',
      link: '/archivista/gestion-plazos',
    },
    {
      title: 'Disposición Automatizada (HU-032)',
      description:
        'Ejecución controlada de eliminación o transferencia con validación obligatoria',
      badge: '10 documentos vencidos',
      features: ['Revisar documentos', 'Aprobar/Rechazar', 'Generar Acta/SIP'],
      icon: 'settings',
      iconClass: 'soft-orange',
      link: '/archivista/gestion-plazos',
    },
  ];

  goTo(link?: string): void {
    if (link) {
      this.router.navigate([link]);
    }
  }

  getIcon(icon: string): string {
    const icons: Record<string, string> = {
      'folder-open': '📂',
      shield: '🛡️',
      clock: '🕘',
      activity: '∿',
      'file-text': '📄',
      settings: '⚙️',
    };

    return icons[icon] || '•';
  }
}
