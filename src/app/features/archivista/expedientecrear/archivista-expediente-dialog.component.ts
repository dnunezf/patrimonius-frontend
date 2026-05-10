import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';

interface UnidadRow {
  id: number;
  nombre: string;
}

interface SerieRow {
  id: number;
  codigo: string;
  nombre: string;
  unidad_id: number;
  unidad_nombre?: string;
}

interface SubserieRow {
  id: number;
  codigo: string;
  nombre: string;
  serie_id: number;
  serie_nombre?: string;
  unidad_id?: number;
}

@Component({
  selector: 'app-archivista-expediente-dialog',
  templateUrl: './archivista-expediente-dialog.component.html',
  styleUrls: ['./archivista-expediente-dialog.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule],
})
export class ArchivistaExpedienteDialogComponent implements OnInit {
  private readonly apiUrl = environment.apiUrl;

  unidades: UnidadRow[] = [];
  series: SerieRow[] = [];
  subseries: SubserieRow[] = [];

  codigo = '';
  nombre = '';
  descripcion = '';
  unidad_id = 0;
  serie_id = 0;
  subserie_id: number | null = null;

  loading = false;
  errorMsg = '';

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  cargarCatalogos(): void {
    this.cargarUnidades();
    this.cargarSeries();
    this.cargarSubseries();
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
    this.http.get<UnidadRow[]>(`${this.apiUrl}/api/unidades`).subscribe({
      next: (response) => {
        this.unidades = response ?? [];

        if (this.unidades.length === 1 && !this.unidad_id) {
          this.unidad_id = this.unidades[0].id;
        }
      },
      error: (error) => {
        console.error('Error al obtener unidades:', error);
        this.unidades = [];
      },
    });
  }

  cargarSeries(): void {
    this.http.get<SerieRow[]>(`${this.apiUrl}/api/series?all=1`).subscribe({
      next: (response) => {
        this.series = response ?? [];
        console.log('Series actualizadas en expediente:', this.series);
      },
      error: (error) => {
        console.error('Error al obtener series:', error);
        this.series = [];
      },
    });
  }

  cargarSubseries(): void {
    this.http.get<SubserieRow[]>(`${this.apiUrl}/subseries?all=1`).subscribe({
      next: (response) => {
        this.subseries = response ?? [];
        console.log('Subseries actualizadas en expediente:', this.subseries);
      },
      error: (error) => {
        console.error('Error al obtener subseries:', error);
        this.subseries = [];
      },
    });
  }

  get seriesFiltradas(): SerieRow[] {
    if (!this.unidad_id) {
      return this.series;
    }

    return this.series.filter(
      (serie) => Number(serie.unidad_id) === Number(this.unidad_id)
    );
  }

  get subseriesFiltradas(): SubserieRow[] {
    if (!this.serie_id) {
      return [];
    }

    return this.subseries.filter(
      (subserie) => Number(subserie.serie_id) === Number(this.serie_id)
    );
  }

  onUnidadChange(): void {
    this.serie_id = 0;
    this.subserie_id = null;
  }

  onSerieChange(): void {
    this.subserie_id = null;
  }

  crearExpediente(): void {
    this.errorMsg = '';

    this.codigo = this.toUpperValue(this.codigo).trim();
    this.nombre = this.toUpperValue(this.nombre).trim();
    this.descripcion = this.toUpperValue(this.descripcion).trim();

    if (!this.codigo || !this.nombre || !this.unidad_id || !this.serie_id) {
      this.errorMsg = 'Complete código, nombre, unidad organizacional y serie.';
      return;
    }

    const expedienteData = {
      codigo: this.codigo,
      nombre: this.nombre,
      descripcion: this.descripcion || null,
      unidad_id: Number(this.unidad_id),
      serie_id: Number(this.serie_id),
      subserie_id: this.subserie_id ? Number(this.subserie_id) : null,
      estado: 'ACTIVO',
    };

    this.loading = true;

    this.http.post(`${this.apiUrl}/api/expedientes`, expedienteData).subscribe({
      next: (response) => {
        console.log('Expediente creado:', response);
        this.loading = false;
        this.created.emit();
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg =
          error?.error?.message ||
          error?.error?.error ||
          'No se pudo crear el expediente.';

        console.error('Error al crear expediente:', error);
      },
    });
  }

  cancelar(): void {
    this.closed.emit();
  }
}
