import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-archivista-dashboard',
  templateUrl: './archivista-dashboard.component.html',
  styleUrls: ['./archivista-dashboard.component.css'],
  imports: [
    FormsModule
  ]
})
export class ArchivistaDashboardComponent {
  // Variables para manejar la creación de Series y Subseries
  filters = { author: 'Todos', status: 'Todos' };

  // Constructor donde inyectamos el Router
  constructor(private router: Router) {}

  // Redirección a los formularios de creación
  CrearSerie_Subserie(): void {
    this.router.navigate(['/archivista/clasificacion']);
  }

  // Métodos para los filtros
  clearFilters(): void {
    this.filters = { author: 'Todos', status: 'Todos' };
  }

  applyFilters(): void {
    // Aquí deberías añadir la lógica para aplicar los filtros si es necesario
  }
}
