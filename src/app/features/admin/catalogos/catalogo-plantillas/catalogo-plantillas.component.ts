import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-catalogo-plantillas',
  templateUrl: './catalogo-plantillas.component.html',
  imports: [
    CommonModule,FormsModule
  ],
  styleUrls: ['./catalogo-plantillas.component.css']
})
export class CatalogoPlantillasComponent implements OnInit {
  plantillas: any[] = []; // Lista de plantillas
  newPlantilla: any = {}; // Para crear una nueva plantilla

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPlantillas(); // Cargar las plantillas al inicio
  }

  // Cargar plantillas desde el backend
  loadPlantillas(): void {
    this.http.get<any[]>('/api/admin/plantillas').subscribe((data) => {
      this.plantillas = data; // Asignar las plantillas obtenidas
    });
  }

  // Subir una nueva plantilla
  uploadTemplate(): void {
    if (!this.newPlantilla.nombre || !this.newPlantilla.ruta_archivo) {
      alert('El nombre y archivo de la plantilla son obligatorios');
      return;
    }

    this.http.post('/api/admin/plantillas', this.newPlantilla).subscribe(
      (response) => {
        this.plantillas.push(response); // Agregar la nueva plantilla a la lista
        this.newPlantilla = {}; // Limpiar el formulario
      },
      (error) => {
        alert('Hubo un error al subir la plantilla');
        console.error(error);
      }
    );
  }

  // Editar una plantilla existente
  editTemplate(plantilla: any): void {
    const updatedPlantilla = prompt('Nuevo nombre para la plantilla', plantilla.nombre);
    if (updatedPlantilla && updatedPlantilla !== plantilla.nombre) {
      const updatedData = { ...plantilla, nombre: updatedPlantilla };

      this.http.patch(`/api/admin/plantillas/${plantilla.id}`, updatedData).subscribe(
        (response) => {
          plantilla.nombre = updatedPlantilla; // Actualizar el nombre de la plantilla en la lista
        },
        (error) => {
          alert('Hubo un error al actualizar la plantilla');
          console.error(error);
        }
      );
    }
  }

  // Eliminar una plantilla
  deleteTemplate(plantillaId: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar esta plantilla?')) {
      this.http.delete(`/api/admin/plantillas/${plantillaId}`).subscribe(
        () => {
          this.plantillas = this.plantillas.filter((plantilla) => plantilla.id !== plantillaId); // Eliminar la plantilla de la lista
        },
        (error) => {
          alert('Hubo un error al eliminar la plantilla');
          console.error(error);
        }
      );
    }
  }
}
