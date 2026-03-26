import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-archivista-serie-dialog',
  templateUrl: './archivista-serie-dialog.component.html',
  styleUrls: ['./archivista-serie-dialog.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class ArchivistaSerieDialogComponent implements OnInit {
  unidades: any[] = [];
  codigo = '';
  nombre = '';
  descripcion = '';
  unidad_id = 0;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.http.get<any[]>('http://localhost:3000/api/unidades').subscribe({
      next: (response) => {
        this.unidades = response;
        console.log('Unidades:', response);
      },
      error: (error) => {
        console.error('Error al obtener las unidades organizacionales:', error);
      }
    });
  }

  crearSerie(): void {
    if (this.codigo && this.nombre && this.unidad_id !== 0) {
      const serieData = {
        codigo: this.codigo,
        nombre: this.nombre,
        descripcion: this.descripcion,
        unidad_id: this.unidad_id
      };

      this.http.post('http://localhost:3000/api/series', serieData).subscribe({
        next: (response) => {
          console.log('Serie creada:', response);
          this.router.navigate(['/archivista/clasificacion']);
        },
        error: (error) => {
          console.error('Error al crear la serie:', error);
        }
      });
    } else {
      alert('Por favor complete todos los campos obligatorios.');
    }
  }

  cancelar(): void {
    this.router.navigate(['/archivista/clasificacion']);
  }
}
