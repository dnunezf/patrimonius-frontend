import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-archivista-dashboard',
  standalone: true,
  templateUrl: './archivista-dashboard.component.html',
  styleUrls: ['./archivista-dashboard.component.css'],
  imports: [FormsModule]
})
export class ArchivistaDashboardComponent {
  filters = { author: 'Todos', status: 'Todos' };

  constructor(private router: Router) {}

  CrearSerie_Subserie(): void {
    this.router.navigate(['/archivista/clasificacion']);
  }

  irGestionPlazos(): void {
    this.router.navigate(['/archivista/gestion-plazos']);
  }

  clearFilters(): void {
    this.filters = { author: 'Todos', status: 'Todos' };
  }

  applyFilters(): void {
  }
}
