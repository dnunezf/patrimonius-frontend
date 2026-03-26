import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-archivista-clasificacion',
  templateUrl: './archivista-clasificacion.component.html',
  styleUrls: ['./archivista-clasificacion.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class ArchivistaClasificacionComponent implements OnInit {
  series: any[] = [];
  subseries: any[] = [];

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarSeries();
    this.cargarSubseries();
  }

  cargarSeries(): void {
    this.http.get<any[]>('http://localhost:3000/api/series').subscribe({
      next: (response) => {
        this.series = response;
      },
      error: (error) => {
        console.error('Error al obtener las series:', error);
      }
    });
  }

  cargarSubseries(): void {
    this.http.get<any[]>('http://localhost:3000/subseries').subscribe({
      next: (response) => {
        this.subseries = response;
      },
      error: (error) => {
        console.error('Error al obtener las subseries:', error);
      }
    });
  }

  crearSerie(): void {
    this.router.navigate(['/archivista/crear-serie']);
  }

  crearSubserie(): void {
    this.router.navigate(['/archivista/crear-subserie']);
  }

  verSerie(serieId: string): void {
    this.router.navigate([`/archivista/serie/${serieId}`]);
  }

  verSubserie(subserieId: string): void {
    this.router.navigate([`/archivista/subserie/${subserieId}`]);
  }
  eliminarSerie(id: number, nombre: string): void {
    const confirmado = window.confirm(`Seguro que quieres eliminar ${nombre}?`);
    if (!confirmado) return;

    this.http.delete(`http://localhost:3000/api/series/${id}`).subscribe({
      next: () => {
        this.series = this.series.filter(s => s.id !== id);
        alert('Serie eliminada correctamente');
      },
      error: (error) => {
        const mensaje = error?.error?.error || error?.error?.message || 'No se pudo eliminar la serie';
        alert(mensaje);
        console.error('Error al eliminar serie:', error);
      }
    });
  }

  eliminarSubserie(id: number, nombre: string): void {
    const confirmado = window.confirm(`Seguro que quieres eliminar ${nombre}?`);
    if (!confirmado) return;

    this.http.delete(`http://localhost:3000/subseries/${id}`).subscribe({
      next: () => {
        this.subseries = this.subseries.filter(s => s.id !== id);
        alert('Subserie eliminada correctamente');
      },
      error: (error) => {
        const mensaje = error?.error?.error || error?.error?.message || 'No se pudo eliminar la subserie';
        alert(mensaje);
        console.error('Error al eliminar subserie:', error);
      }
    });
  }
}
