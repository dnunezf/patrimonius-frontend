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

  moduleCards = [
    {
      title: 'Clasificación Archivistica',
      description:
        'Modulo de visualización para la clasificación de documentos',
      badge: '1 pendientes',
      features: ['Crear Series y Subseries', 'Muestra la lista de Clasificaciones [Serie/Subserie/Expediente] existentes', 'Permite el cierre de expedientes','Lista de Índices Electrónicos'],
      icon: 'folder-open',
      iconClass: 'soft-blue',
      link: '/archivista/clasificacion',
    },
    {
      title: 'Seguimiento de Conservación ',
      description:
        'Control de vigencia y disposición final de documentos archivados',
      badge: '10 documentos',
      features: ['Controlar vigencia', 'Gestionar alertas', 'Disposición final'],
      icon: 'clock',
      iconClass: 'soft-cyan',
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
