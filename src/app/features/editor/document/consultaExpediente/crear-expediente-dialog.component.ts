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

  resetForm(): void {
    this.loading = false;
    this.saving = false;
    this.error = '';
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

    const nombre = this.nombre.trim();
    if (!nombre) {
      this.error = 'El nombre del expediente es obligatorio.';
      return;
    }

    if (!this.serieId) {
      this.error = 'Debe seleccionar una serie.';
      return;
    }

    const serieSeleccionada = this.series.find((s) => s.id === this.serieId);
    if (!serieSeleccionada?.unidad_id) {
      this.error = 'La serie seleccionada no tiene unidad organizacional válida.';
      return;
    }

    this.saving = true;

    const codigoGenerado = `EXP-${Date.now()}`;

    this.expedienteService.createExpediente({
      codigo: codigoGenerado,
      nombre,
      unidad_id: serieSeleccionada.unidad_id,
      serie_id: this.serieId,
      subserie_id: this.subserieId,
      estado: 'ACTIVO',
    }).subscribe({
      next: () => {
        this.saving = false;
        this.created.emit();
        this.close();
      },
      error: (e) => {
        this.saving = false;
        this.error = e?.error?.message || 'No se pudo crear el expediente';
      },
    });
  }

  close(): void {
    this.open = false;
    this.closed.emit();
  }
}
