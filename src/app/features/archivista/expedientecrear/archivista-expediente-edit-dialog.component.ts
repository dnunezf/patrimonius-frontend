import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface UnidadRow {
  id: number;
  nombre: string;
}

interface SerieRow {
  id: number;
  codigo?: string;
  nombre: string;
  unidad_id: number;
  unidad_nombre?: string;
}

interface SubserieRow {
  id: number;
  codigo?: string;
  nombre: string;
  serie_id: number;
  serie_nombre?: string;
  unidad_id?: number;
}

@Component({
  selector: 'app-archivista-expediente-edit-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './archivista-expediente-edit-dialog.component.html',
  styleUrls: ['./archivista-expediente-edit-dialog.component.css'],
})
export class ArchivistaExpedienteEditDialogComponent implements OnInit, OnChanges {
  private readonly apiUrl = environment.apiUrl;

  @Input() expediente: any | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  unidades: UnidadRow[] = [];
  series: SerieRow[] = [];
  subseries: SubserieRow[] = [];

  codigo = '';
  nombre = '';
  descripcion = '';
  unidad_id = 0;
  serie_id = 0;
  subserie_id: number | null = null;
  estado = '';

  loading = false;
  errorMsg = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarUnidades();
    this.cargarSeries();
    this.cargarSubseries();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['expediente']) {
      this.cargarDatosExpediente();
    }
  }

  private cargarDatosExpediente(): void {
    this.errorMsg = '';

    if (!this.expediente) {
      this.codigo = '';
      this.nombre = '';
      this.descripcion = '';
      this.unidad_id = 0;
      this.serie_id = 0;
      this.subserie_id = null;
      this.estado = '';
      return;
    }

    this.codigo = this.expediente.codigo ?? '';
    this.nombre = this.expediente.nombre ?? '';
    this.descripcion = this.expediente.descripcion ?? '';
    this.unidad_id = Number(this.expediente.unidad_id ?? 0);
    this.serie_id = Number(this.expediente.serie_id ?? 0);
    this.subserie_id = this.expediente.subserie_id
      ? Number(this.expediente.subserie_id)
      : null;
    this.estado = String(this.expediente.estado ?? '');
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
      },
      error: (error) => {
        console.error('Error al obtener unidades:', error);
      },
    });
  }

  cargarSeries(): void {
    this.http.get<SerieRow[]>(`${this.apiUrl}/api/series`).subscribe({
      next: (response) => {
        this.series = response ?? [];
      },
      error: (error) => {
        console.error('Error al obtener series:', error);
      },
    });
  }

  cargarSubseries(): void {
    this.http.get<SubserieRow[]>(`${this.apiUrl}/subseries`).subscribe({
      next: (response) => {
        this.subseries = response ?? [];
      },
      error: (error) => {
        console.error('Error al obtener subseries:', error);
      },
    });
  }

  get seriesFiltradas(): SerieRow[] {
    if (!this.unidad_id) {
      return this.series;
    }

    return this.series.filter(
      (serie) => Number(serie.unidad_id) === Number(this.unidad_id),
    );
  }

  get subseriesFiltradas(): SubserieRow[] {
    if (!this.serie_id) {
      return [];
    }

    return this.subseries.filter(
      (subserie) => Number(subserie.serie_id) === Number(this.serie_id),
    );
  }

  onUnidadChange(): void {
    this.serie_id = 0;
    this.subserie_id = null;
  }

  onSerieChange(): void {
    this.subserie_id = null;
  }

  guardarCambios(): void {
    this.errorMsg = '';

    if (!this.expediente?.id) {
      this.errorMsg = 'No se pudo determinar el expediente a editar.';
      return;
    }

    if (String(this.estado).toUpperCase() !== 'ACTIVO') {
      this.errorMsg = 'Solo se pueden editar expedientes en estado ACTIVO.';
      return;
    }

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
      fecha_cierre: null,
    };

    this.loading = true;

    this.http.put(`${this.apiUrl}/api/expedientes/${this.expediente.id}`, expedienteData).subscribe({
      next: (response) => {
        console.log('Expediente actualizado:', response);
        this.loading = false;
        this.updated.emit();
      },
      error: (error) => {
        console.error('Error al actualizar expediente:', error);
        this.loading = false;
        this.errorMsg =
          error?.error?.message ||
          error?.error?.error ||
          'No se pudo actualizar el expediente.';
      },
    });
  }

  cancelar(): void {
    this.closed.emit();
  }
}
