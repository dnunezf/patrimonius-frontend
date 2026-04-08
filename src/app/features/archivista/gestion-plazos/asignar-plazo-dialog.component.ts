import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsignarPlazoBody, DocumentoPlazoRow, DocumentService } from '../../../../core/services/document.service';

@Component({
  selector: 'app-asignar-plazo-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asignar-plazo-dialog.component.html',
  styleUrls: ['./asignar-plazo-dialog.component.css']
})
export class AsignarPlazoDialogComponent implements OnChanges {
  @Input() open = false;
  @Input() documento: DocumentoPlazoRow | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  plazo_valor: number | null = null;
  plazo_unidad: 'ANIOS' = 'ANIOS'; // Solo Años
  fecha_inicio_conservacion = new Date().toISOString().slice(0, 10); // Establece la fecha de inicio como la fecha actual
  fecha_vencimiento = ''; // Fecha de vencimiento calculada

  loading = false;
  error = '';

  constructor(private readonly documentService: DocumentService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['documento'] && this.documento) {
      this.plazo_valor = this.documento.plazo_valor;
      this.fecha_inicio_conservacion = this.toDateInput(
        this.documento?.fecha_inicio_conservacion || new Date()
      );
      this.error = '';
      this.calcularFechaVencimiento(); // Calcula la fecha de vencimiento cada vez que cambia el plazo
    }

    if (changes['open'] && !this.open) {
      this.loading = false;
      this.error = '';
    }
  }

  calcularFechaVencimiento(): void {
    if (this.plazo_valor && this.plazo_unidad === 'ANIOS') {
      const fechaInicio = new Date(this.fecha_inicio_conservacion);
      fechaInicio.setFullYear(fechaInicio.getFullYear() + this.plazo_valor); // Añadimos el plazo de años
      this.fecha_vencimiento = fechaInicio.toISOString().slice(0, 10); // Establece la fecha de vencimiento en formato 'YYYY-MM-DD'
    }
  }

  cerrar(): void {
    if (this.loading) return;
    this.closed.emit();
  }

  guardar(): void {
    if (!this.documento?.id) return;

    if (!this.plazo_valor || this.plazo_valor <= 0) {
      this.error = 'Ingresa un valor de plazo válido.';
      return;
    }

    if (!this.fecha_inicio_conservacion) {
      this.error = 'Selecciona una fecha de inicio.';
      return;
    }

    // Asegúrate de que fecha_vencimiento no esté vacía antes de enviar
    if (!this.fecha_vencimiento) {
      this.error = 'La fecha de vencimiento no puede estar vacía.';
      return;
    }

    const body: AsignarPlazoBody = {
      plazo_valor: this.plazo_valor,
      plazo_unidad: this.plazo_unidad,
      fecha_inicio_conservacion: this.fecha_inicio_conservacion,
      fecha_vencimiento: this.fecha_vencimiento,
    };

    this.loading = true;
    this.error = '';

    this.documentService.asignarPlazo(this.documento.id, body).subscribe({
      next: () => {
        this.loading = false;
        this.saved.emit();
      },
      error: (err) => {
        this.loading = false;
        this.error =
          err?.error?.error || 'No se pudo asignar el plazo de conservación.';
      }
    });
  }

  private toDateInput(value: string | Date): string {
    if (!value) return '';
    // Si value es un Date, lo convertimos a string en formato 'yyyy-mm-dd'
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    // Si ya es un string, lo devolvemos tal cual
    return value.slice(0, 10);
  }
}
