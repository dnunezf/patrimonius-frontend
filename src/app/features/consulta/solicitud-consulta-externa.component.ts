import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * Espacio reservado (HU-025): mini dashboard de solicitudes de documento por usuario externo.
 * La lógica y el listado la implementará otro módulo; esta ruta queda enlazada desde la consulta externa.
 */
@Component({
  selector: 'app-solicitud-consulta-externa',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './solicitud-consulta-externa.component.html',
  styleUrls: ['./solicitud-consulta-externa.component.css'],
})
export class SolicitudConsultaExternaComponent {}
