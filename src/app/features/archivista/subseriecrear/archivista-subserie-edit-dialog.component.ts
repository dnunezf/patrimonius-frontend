import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface SerieRow {
  id: number;
  codigo?: string;
  nombre: string;
  unidad_id?: number;
  unidad_nombre?: string;
}

@Component({
  selector: 'app-archivista-subserie-edit-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './archivista-subserie-edit-dialog.component.html',
  styleUrls: ['./archivista-subserie-edit-dialog.component.css'],
})
export class ArchivistaSubserieEditDialogComponent implements OnInit, OnChanges {
  @Input() subserie: any | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  series: SerieRow[] = [];

  codigo = '';
  nombre = '';
  descripcion = '';
  serie_id = 0;

  loading = false;
  errorMsg = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarSeries();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['subserie']) {
      this.cargarDatosSubserie();
    }
  }

  private cargarDatosSubserie(): void {
    this.errorMsg = '';

    if (!this.subserie) {
      this.codigo = '';
      this.nombre = '';
      this.descripcion = '';
      this.serie_id = 0;
      return;
    }

    this.codigo = this.subserie.codigo ?? '';
    this.nombre = this.subserie.nombre ?? '';
    this.descripcion = this.subserie.descripcion ?? '';
    this.serie_id = Number(this.subserie.serie_id ?? 0);
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

  cargarSeries(): void {
    this.http.get<SerieRow[]>('http://localhost:3000/api/series').subscribe({
      next: (response) => {
        this.series = response ?? [];
      },
      error: (error) => {
        console.error('Error al obtener series:', error);
      },
    });
  }

  guardarCambios(): void {
    this.errorMsg = '';

    if (!this.subserie?.id) {
      this.errorMsg = 'No se pudo determinar la subserie a editar.';
      return;
    }

    this.codigo = this.toUpperValue(this.codigo).trim();
    this.nombre = this.toUpperValue(this.nombre).trim();
    this.descripcion = this.toUpperValue(this.descripcion).trim();

    if (!this.codigo || !this.nombre || this.serie_id === 0) {
      this.errorMsg = 'Complete código, nombre de subserie y serie.';
      return;
    }

    const subserieData = {
      codigo: this.codigo,
      nombre: this.nombre,
      descripcion: this.descripcion,
      serie_id: Number(this.serie_id),
    };

    this.loading = true;

    this.http.put(`http://localhost:3000/subseries/${this.subserie.id}`, subserieData).subscribe({
      next: (response) => {
        console.log('Subserie actualizada:', response);
        this.loading = false;
        this.updated.emit();
      },
      error: (error) => {
        console.error('Error al actualizar la subserie:', error);
        this.loading = false;
        this.errorMsg =
          error?.error?.message ||
          error?.error?.error ||
          'No se pudo actualizar la subserie.';
      },
    });
  }

  cancelar(): void {
    this.closed.emit();
  }
}
