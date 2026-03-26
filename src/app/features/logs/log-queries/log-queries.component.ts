// log-queries.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';


@Component({
  selector: 'app-log-queries',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './log-queries.component.html',
  styleUrls: ['./log-queries.component.css']
})
export class LogQueriesComponent {
  // Array for storing bitacora data including image filenames and functions
  bitacoras = [
    {
      title: 'Bitácora de Ciclo Documental',
      description: 'Registra el ciclo completo de los documentos: creación, ediciones, firmas, archivado, eliminación y transferencias.',
      icon: 'document-signed.png',
      funciones: [
        'Filtrar eventos',
        'Exportar XML',
        'Ver historial detallado'
      ],
      link: '/logs/document-cycle',
    },
    {
      title: 'Bitácora de Seguridad',
      description: 'Registra intentos de acceso, autenticación, fallos de login, accesos no autorizados y actividades de seguridad del sistema.',
      icon: 'lock.png',
      funciones: [
        'Monitorear accesos',
        'Detectar anomalías',
        'Reportes de seguridad'
      ],
      link: '/logs/security',
    },
    {
      title: 'Bitácora de Actividad de Usuario',
      description:
        'Registra solicitudes de permisos, excepciones de acceso, responsables, usuarios objetivo y ventanas de acceso a documentos.',
      icon: 'users.png',
      funciones: [
        'Filtrar por flujo, fechas y documento',
        'Ver detalle completo del evento',
        'Auditar acciones sobre permisos',
      ],
      link: '/logs/user-activity',
    },
  ];

  // Function to dynamically generate the image path for each icon
  getIconPath(iconName: string): string {
    return `assets/icons/${iconName}`;
  }
}


