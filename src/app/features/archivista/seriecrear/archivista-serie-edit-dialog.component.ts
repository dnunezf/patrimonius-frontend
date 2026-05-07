import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface UnidadRow {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-archivista-serie-edit-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './archivista-serie-edit-dialog.component.html',
  styleUrls: ['./archivista-serie-edit-dialog.component.css'],
})
export class ArchivistaSerieEditDialogComponent implements OnChanges {
  @Input() serie: any | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  unidades: UnidadRow[] = [];

  codigo = '';
  nombre = '';
  descripcion = '';
  unidad_id = 0;
  plazo_conservacion_anios = 5;

  loading = false;
  errorMsg = '';

  constructor(private http: HttpClient) {
    this.cargarUnidades();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['serie']) {
      this.cargarDatosSerie();
    }
  }

  private cargarDatosSerie(): void {
    this.errorMsg = '';

    if (!this.serie) {
      this.codigo = '';
      this.nombre = '';
      this.descripcion = '';
      this.unidad_id = 0;
      this.plazo_conservacion_anios = 5;
      return;
    }

    this.codigo = this.serie.codigo ?? '';
    this.nombre = this.serie.nombre ?? '';
    this.descripcion = this.serie.descripcion ?? '';
    this.unidad_id = Number(this.serie.unidad_id ?? 0);
    this.plazo_conservacion_anios = Number(this.serie.plazo_conservacion_anios ?? 5);
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

  cargarUnidades(): void {
    this.http.get<UnidadRow[]>('http://localhost:3000/api/unidades').subscribe({
      next: (response) => {
        this.unidades = response ?? [];
      },
      error: (error) => {
        console.error('Error al obtener unidades:', error);
      },
    });
  }

  guardarCambios(): void {
    this.errorMsg = '';

    if (!this.serie?.id) {
      this.errorMsg = 'No se pudo determinar la serie a editar.';
      return;
    }

    this.codigo = this.toUpperValue(this.codigo).trim();
    this.nombre = this.toUpperValue(this.nombre).trim();
    this.descripcion = this.toUpperValue(this.descripcion).trim();

    const plazo = Number(this.plazo_conservacion_anios);

    if (
      !this.codigo ||
      !this.nombre ||
      this.unidad_id === 0 ||
      !Number.isInteger(plazo) ||
      plazo <= 0
    ) {
      this.errorMsg =
        'Complete código, nombre de serie, unidad y un plazo de conservación en años.';
      return;
    }

    const serieData = {
      codigo: this.codigo,
      nombre: this.nombre,
      descripcion: this.descripcion,
      unidad_id: Number(this.unidad_id),
      plazo_conservacion_anios: plazo,
    };

    this.loading = true;

    this.http.put(`http://localhost:3000/api/series/${this.serie.id}`, serieData).subscribe({
      next: (response) => {
        console.log('Serie actualizada:', response);
        this.loading = false;
        this.updated.emit();
      },
      error: (error) => {
        console.error('Error al actualizar la serie:', error);
        this.loading = false;
        this.errorMsg =
          error?.error?.message ||
          error?.error?.error ||
          'No se pudo actualizar la serie.';
      },
    });
  }

  cancelar(): void {
    this.closed.emit();
  }
}
