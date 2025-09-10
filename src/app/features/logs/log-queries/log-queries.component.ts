// log-queries.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router'; // Import RouterLink


@Component({
  selector: 'app-log-queries',
  standalone: true,
  imports: [CommonModule, RouterLink], // Add RouterLink here
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
      ]
    },
    {
      title: 'Bitácora de Seguridad',
      description: 'Registra intentos de acceso, autenticación, fallos de login, accesos no autorizados y actividades de seguridad del sistema.',
      icon: 'lock.png',
      funciones: [
        'Monitorear accesos',
        'Detectar anomalías',
        'Reportes de seguridad'
      ]
    },
    {
      title: 'Bitácora de Actividad de Usuario',
      description: 'Registra vistas, búsquedas, descargas, navegación general y comportamiento de usuarios en el sistema.',
      icon: 'users.png',
      funciones: [
        'Analizar comportamiento',
        'Estadísticas de uso',
        'Patrones de navegación'
      ]
    }
  ];

  // Function to dynamically generate the image path for each icon
  getIconPath(iconName: string): string {
    return `assets/icons/${iconName}`;
  }
}
