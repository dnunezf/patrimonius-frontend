import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-catalogo-unidad',
  templateUrl: './catalogo-unidad.component.html',
  imports: [
    CommonModule,FormsModule
  ],
  styleUrls: ['./catalogo-unidad.component.css']
})
export class CatalogoUnidadComponent implements OnInit {
  unidades: any[] = []; // Lista de unidades organizacionales
  newUnidad: any = {};  // Para crear una nueva unidad

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUnidades(); // Cargar las unidades al inicio
  }

  // Cargar unidades organizacionales desde el backend
  loadUnidades(): void {
    this.http.get<any[]>('/api/admin/unidades').subscribe((data) => {
      this.unidades = data; // Asignar las unidades obtenidas
    });
  }

  // Crear una nueva unidad organizacional
  createUnidad(): void {
    if (!this.newUnidad.nombre) {
      alert('El nombre de la unidad es obligatorio');
      return;
    }

    this.http.post('/api/admin/unidades', this.newUnidad).subscribe(
      (response) => {
        this.unidades.push(response); // Agregar la nueva unidad a la lista
        this.newUnidad = {}; // Limpiar el formulario
      },
      (error) => {
        alert('Hubo un error al crear la unidad');
        console.error(error);
      }
    );
  }

  // Editar una unidad organizacional
  editUnidad(unidad: any): void {
    const updatedUnidad = prompt('Nuevo nombre para la unidad', unidad.nombre);
    if (updatedUnidad && updatedUnidad !== unidad.nombre) {
      const updatedData = { ...unidad, nombre: updatedUnidad };

      this.http.patch(`/api/admin/unidades/${unidad.id}`, updatedData).subscribe(
        (response) => {
          unidad.nombre = updatedUnidad; // Actualizar el nombre de la unidad en la lista
        },
        (error) => {
          alert('Hubo un error al actualizar la unidad');
          console.error(error);
        }
      );
    }
  }

  // Eliminar una unidad organizacional
  deleteUnidad(unidadId: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar esta unidad?')) {
      this.http.delete(`/api/admin/unidades/${unidadId}`).subscribe(
        () => {
          this.unidades = this.unidades.filter((unidad) => unidad.id !== unidadId); // Eliminar la unidad de la lista
        },
        (error) => {
          alert('Hubo un error al eliminar la unidad');
          console.error(error);
        }
      );
    }
  }
}
