import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogosService, Plantilla } from '../../../../../core/services/catalogos.service';


@Component({
  selector: 'app-catalogo-plantillas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalogo-plantillas.component.html',
  styleUrls: ['./catalogo-plantillas.component.css'],
})
export class CatalogoPlantillasComponent implements OnInit {
  plantillas: Plantilla[] = [];
  form = { nombre: '', version: '', descripcion: '' };
  file?: File;
  loading = false;

  constructor(private api: CatalogosService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getPlantillas().subscribe({
      next: (d) => { this.plantillas = d; this.loading = false; },
      error: () => { this.loading = false; alert('Error cargando plantillas'); },
    });
  }

  onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    this.file = input.files?.[0];
  }

  upload() {
    if (!this.form.nombre || !this.form.version || !this.file) {
      alert('Nombre, versión y archivo son obligatorios');
      return;
    }
    this.api.uploadPlantilla({ ...this.form, file: this.file }).subscribe({
      next: (p) => {
        this.plantillas.push(p);
        this.form = { nombre: '', version: '', descripcion: '' };
        this.file = undefined;
      },
      error: () => alert('Error subiendo plantilla'),
    });
  }

  rename(p: Plantilla) {
    const nuevo = prompt('Nuevo nombre', p.nombre);
    if (!nuevo || nuevo === p.nombre) return;
    this.api.updatePlantilla(p.id, { nombre: nuevo }).subscribe({
      next: (up) => Object.assign(p, up),
      error: () => alert('Error renombrando plantilla'),
    });
  }

  remove(id: number) {
    if (!confirm('¿Eliminar plantilla?')) return;
    this.api.deletePlantilla(id).subscribe({
      next: () => (this.plantillas = this.plantillas.filter((x) => x.id !== id)),
      error: () => alert('No se pudo eliminar plantilla'),
    });
  }
}
