import {Component, NgModule, OnInit} from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';  // Asegúrate de que HttpClient esté importado
import { FormsModule } from '@angular/forms';
import {CommonModule, NgClass} from '@angular/common';

@Component({
  selector: 'app-archivista-clasificacion',
  templateUrl: './archivista-clasificacion.component.html',
  styleUrls: ['./archivista-clasificacion.component.css'],
  standalone: true,
  imports: [
    FormsModule,CommonModule
  ]
})
export class ArchivistaClasificacionComponent implements OnInit {
  series: any[] = []; // Almacenaremos las series aquí

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    // Llamamos al backend para obtener las series
    this.http.get<any[]>('http://localhost:3000/api/series').subscribe(
      (response) => {
        this.series = response;
      },
      (error) => {
        console.error('Error al obtener las series:', error);
      }
    );
  }

  // Función para crear una nueva serie
  crearSerie(): void {
    // Redirige a la página de creación de serie
    this.router.navigate(['/archivista/crear-serie']);
  }

  // Función para crear una nueva subserie
  crearSubserie(): void {
    // Redirige a la página de creación de subserie
    this.router.navigate(['/archivista/crear-subserie']);
  }

  // Función para ver detalles de una serie
  verSerie(serieId: string): void {
    // Redirige a la página de detalles de la serie
    this.router.navigate([`/archivista/serie/${serieId}`]);
  }
}
