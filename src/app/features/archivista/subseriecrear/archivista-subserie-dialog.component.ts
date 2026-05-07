import { Component, EventEmitter, OnInit, Output} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-archivista-subserie-dialog',
  templateUrl: './archivista-subserie-dialog.component.html',
  styleUrls: ['./archivista-subserie-dialog.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class ArchivistaSubserieDialogComponent implements OnInit {
  series: any[] = [];

  codigo = '';
  nombre = '';
  descripcion = '';
  serie_id = 0;

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any[]>('http://localhost:3000/api/series').subscribe({
      next: (response) => {
        this.series = response;
        console.log('Series:', response);
      },
      error: (error) => {
        console.error('Error al obtener las series:', error);
      }
    });
  }

  private toUpperValue(value: string | null | undefined): string {
    return String(value || '').toUpperCase();
  }

  onCodigoInput(): void {
    this.codigo = this.toUpperValue(this.codigo);
  }

  onNombreInput(): void {
    this.nombre = this.toUpperValue(this.nombre);
  }

  onDescripcionInput(): void {
    this.descripcion = this.toUpperValue(this.descripcion);
  }

  crearSubserie(): void {
    this.codigo = this.toUpperValue(this.codigo).trim();
    this.nombre = this.toUpperValue(this.nombre).trim();
    this.descripcion = this.toUpperValue(this.descripcion).trim();

    if (this.codigo && this.nombre && this.serie_id !== 0) {
      const subserieData = {
        codigo: this.codigo,
        nombre: this.nombre,
        descripcion: this.descripcion,
        serie_id: this.serie_id,
      };

      this.http.post('http://localhost:3000/subseries', subserieData).subscribe({
        next: (response) => {
          console.log('Subserie creada:', response);
          this.created.emit();
        },
        error: (error) => {
          console.error('Error al crear la subserie:', error);
        },
      });
    } else {
      alert('Por favor complete todos los campos obligatorios.');
    }
  }

  cancelar(): void {
    this.closed.emit();
  }
}
