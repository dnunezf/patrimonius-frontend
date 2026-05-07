import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ExpedienteService,
  SerieLite,
  SubserieLite,
} from '../../../../../core/services/expediente.service';

@Component({
  selector: 'app-crear-expediente-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-expediente-dialog.component.html',
  styleUrls: ['./crear-expediente-dialog.component.css'],
})
export class CrearExpedienteDialogComponent implements OnChanges {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  loading = false;
  saving = false;
  error = '';
  success = '';

  codigo = '';
  nombre = '';
  serieId: number | null = null;
  subserieId: number | null = null;

  series: SerieLite[] = [];
  subseries: SubserieLite[] = [];


  constructor(private expedienteService: ExpedienteService) {}

  ngOnChanges(): void {
    if (this.open) {
      this.resetForm();
      this.cargarSeries();
    }
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

  resetForm(): void {
    this.loading = false;
    this.saving = false;
    this.error = '';
    this.success = '';
    this.codigo = '';
    this.nombre = '';
    this.serieId = null;
    this.subserieId = null;
    this.series = [];
    this.subseries = [];
  }

  cargarSeries(): void {
    this.loading = true;
    this.error = '';

    this.expedienteService.getSeries().subscribe({
      next: (rows) => {
        this.series = rows ?? [];
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.message || 'No se pudieron cargar las series';
        this.loading = false;
      },
    });
  }

  onSerieChange(): void {
    this.subserieId = null;
    this.subseries = [];

    if (!this.serieId) return;

    this.expedienteService.getSubseries(this.serieId).subscribe({
      next: (rows) => {
        this.subseries = rows ?? [];
      },
      error: (e) => {
        this.error = e?.error?.message || 'No se pudieron cargar las subseries';
      },
    });
  }

  guardar(): void {
    this.error = '';
    this.success = '';

    this.codigo = this.toUpperValue(this.codigo).trim();
    this.nombre = this.toUpperValue(this.nombre).trim();

    if (!this.codigo) {
      this.error = 'El código del expediente es obligatorio.';
      return;
    }

    if (!this.nombre) {
      this.error = 'El nombre del expediente es obligatorio.';
      return;
    }

    if (!this.serieId) {
      this.error = 'Debe seleccionar una serie.';
      return;
    }

    const serieSeleccionada = this.series.find(
      (s) => Number(s.id) === Number(this.serieId),
    );

    if (!serieSeleccionada?.unidad_id) {
      this.error = 'La serie seleccionada no tiene unidad organizacional válida.';
      return;
    }

    this.saving = true;

    this.expedienteService.createExpediente({
      codigo: this.codigo,
      nombre: this.nombre,
      unidad_id: Number(serieSeleccionada.unidad_id),
      serie_id: Number(this.serieId),
      subserie_id: this.subserieId ? Number(this.subserieId) : null,
      estado: 'ACTIVO',
    }).subscribe({
      next: () => {
        this.saving = false;
        this.success = 'Expediente creado correctamente.';

        this.created.emit();

        setTimeout(() => {
          this.close();
        }, 900);
      },
      error: (e) => {
        this.saving = false;
        this.error =
          e?.error?.message ||
          e?.error?.error ||
          'No se pudo crear el expediente';
      },
    });
  }

  close(): void {
    this.open = false;
    this.closed.emit();
  }
}
