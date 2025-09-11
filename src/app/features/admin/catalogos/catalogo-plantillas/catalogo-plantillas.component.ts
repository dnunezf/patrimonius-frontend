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
  errorMessage: string = '';  // Mensaje de error

  constructor(private api: CatalogosService) {}

  ngOnInit() {
    this.load();  // Cargar las plantillas al inicio
  }

  load() {
    this.loading = true;
    this.errorMessage = '';  // Limpiar mensaje de error al cargar

    this.api.getPlantillas().subscribe({
      next: (plantillas) => {
        if (Array.isArray(plantillas)) {
          // Aquí nos aseguramos que la respuesta sea un arreglo
          this.plantillas = plantillas;
        } else {
          // Si no es un arreglo, mostramos el error
          this.errorMessage = 'No se encontraron plantillas.';
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = 'Error cargando plantillas';
        console.error(err);  // Para que puedas ver el error en consola
      },
    });
  }





  onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    this.file = input.files?.[0];  // Capturar el archivo seleccionado
  }

  upload() {
    if (!this.form.nombre || !this.form.version || !this.file) {
      alert('Nombre, versión y archivo son obligatorios');
      return;
    }
    this.api.uploadPlantilla({ ...this.form, file: this.file }).subscribe({
      next: (p) => {
        this.plantillas.push(p);  // Agregar la nueva plantilla a la lista
        this.form = { nombre: '', version: '', descripcion: '' };  // Limpiar el formulario
        this.file = undefined;  // Limpiar el archivo
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
      next: () => {
        this.plantillas = this.plantillas.filter((x) => x.id !== id);  // Eliminar la plantilla de la lista
      },
      error: () => alert('No se pudo eliminar plantilla'),
    });
  }
}
