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
      title: 'Bitácora de Permisos y Accesos',
      description:
        'Auditoría de permisos sobre documentos: solicitudes de acceso, excepciones, responsables, usuarios beneficiarios y ventanas de acceso.',
      icon: 'users.png',
      funciones: [
        'Filtrar por flujo, fechas y documento',
        'Ver detalle completo del evento',
        'Auditar acciones sobre permisos',
      ],
      link: '/logs/user-activity',
    },
    {
      title: 'Bitácora de Actividad de Usuario',
      description:
        'Monitorea las descargas, búsquedas y visualización de documentos  conservación.',
      icon: 'users.png',
      funciones: [
        'Filtrar por usuario, actividad, recurso y fechas',
        'Ver detalle con parámetros completos',
        'Exportar CSV y XML del listado visible',
      ],
      link: '/logs/actividad-usuario',
    },
    {
      title: 'Bitácora de expedientes',
      description:
        'Historial del ciclo de vida del expediente: creación, cierre, documentos vinculados, permisos, visitas y descargas.',
      icon: 'document-signed.png',
      funciones: [
        'Filtrar por evento, resultado, expediente y fechas',
        'Ver detalle con JSON y datos de unidad',
        'Exportar CSV y XML',
      ],
      link: '/logs/expediente-bitacora',
    },
  ];

  // Function to dynamically generate the image path for each icon
  getIconPath(iconName: string): string {
    return `assets/icons/${iconName}`;
  }
}


