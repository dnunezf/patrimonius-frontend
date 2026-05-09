import { Component, EventEmitter, OnInit, Output} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';

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
  /** Años de conservación en archivo (requerido para ingreso a conservación). */
  plazo_conservacion_anios = 5;

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any[]>(`${environment.apiUrl}/api/unidades`).subscribe({
      next: (response) => {
        this.unidades = response;
        console.log('Unidades:', response);
      },
      error: (error) => {
        console.error('Error al obtener las unidades organizacionales:', error);
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

  crearSerie(): void {
    this.codigo = this.toUpperValue(this.codigo).trim();
    this.nombre = this.toUpperValue(this.nombre).trim();
    this.descripcion = this.toUpperValue(this.descripcion).trim();

    const plazo = Number(this.plazo_conservacion_anios);

    if (
      this.codigo &&
      this.nombre &&
      this.unidad_id !== 0 &&
      Number.isInteger(plazo) &&
      plazo > 0
    ) {
      const serieData = {
        codigo: this.codigo,
        nombre: this.nombre,
        descripcion: this.descripcion,
        unidad_id: this.unidad_id,
        plazo_conservacion_anios: plazo,
      };

      this.http.post(`${environment.apiUrl}/api/series`, serieData).subscribe({
        next: (response) => {
          console.log('Serie creada:', response);
          this.created.emit();
        },
        error: (error) => {
          console.error('Error al crear la serie:', error);
        },
      });
    } else {
      alert(
        'Complete código, nombre de serie, unidad y un plazo de conservación en años (entero ≥ 1).',
      );
    }
  }

  cancelar(): void {
    this.closed.emit();
  }
}
