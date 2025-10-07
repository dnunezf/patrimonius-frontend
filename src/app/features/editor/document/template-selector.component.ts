import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlantillaService, PlantillaModel } from 'core/services/plantilla.service';

@Component({
  standalone: true,
  selector: 'app-template-selector',
  imports: [CommonModule],
  templateUrl: './template-selector.component.html',
  styleUrls: ['./template-selector.component.css']
})
export class TemplateSelectorComponent {
  @Output() selected = new EventEmitter<PlantillaModel | null>();
  plantillas: PlantillaModel[] = [];
  loading = false;
  error = '';

  constructor(private plantillaService: PlantillaService) {}

  ngOnInit() {
    this.loading = true;
    this.plantillaService.listar().subscribe({
      next: (rows) => {
        this.loading = false;
        this.plantillas = rows;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.message || 'Error al cargar plantillas';
      }
    });
  }

  elegir(p: PlantillaModel) {
    this.selected.emit(p);
  }

  cancelar() {
    this.selected.emit(null);
  }
}
