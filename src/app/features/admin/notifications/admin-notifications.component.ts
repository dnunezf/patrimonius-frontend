import { Component } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { TitleCasePipe } from '@angular/common';

interface Notice {
  title: string;
  level: 'low' | 'medium' | 'high';
  fresh: boolean;
  body: string;
  time: string;
}

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [NgFor, NgIf, TitleCasePipe],
  templateUrl: './admin-notifications.component.html',
  styleUrls: ['./admin-notifications.component.css'],
})

export class AdminNotificationsComponent {
  /*test data*/
  notices: Notice[] = [
    {
      title: 'Intento de edición denegado',
      level: 'medium',
      fresh: true,
      body: "El editor carlos.rodriguez@mncr.go.cr intentó editar un documento firmado 'Acta de Junta Directiva - Enero 2025'.",
      time: '25/01/2025, 04:15',
    },
    {
      title: 'Documento enviado a conservación',
      level: 'low',
      fresh: true,
      body: 'El documento OFI_MNCR-DAF-AC-034-2025 cambió de estado a conservación tras completarse todas las firmas.',
      time: '25/01/2025, 03:45',
    },
    {
      title: 'Intento de modificación de documento archivado',
      level: 'high',
      fresh: false,
      body: "La usuaria maria.lopez@mncr.go.cr intentó modificar un documento archivado 'Manual de Procedimientos'.",
      time: '24/01/2025, 10:30',
    },
    {
      title: 'Carga masiva completada',
      level: 'medium',
      fresh: true,
      body: '150 documentos procesados correctamente.',
      time: '24/01/2025, 04:30',
    },
    {
      title: 'Múltiples intentos de acceso denegados',
      level: 'high',
      fresh: true,
      body: 'Se registraron 5 intentos de acceso denegados en los últimos 30 minutos desde la misma IP.',
      time: '25/01/2025, 05:00',
    },
  ];
}
