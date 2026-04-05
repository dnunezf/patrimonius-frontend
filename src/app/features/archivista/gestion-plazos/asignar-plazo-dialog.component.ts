import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {AsignarPlazoBody, DocumentoPlazoRow, DocumentService} from '../../../../core/services/document.service';


@Component({
  selector: 'app-asignar-plazo-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asignar-plazo-dialog.component.html',
  styleUrl: './asignar-plazo-dialog.component.css'
})
export class AsignarPlazoDialogComponent implements OnChanges {
  @Input() open = false;
  @Input() documento: DocumentoPlazoRow | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  plazo_valor: number | null = null;
  plazo_unidad: 'DIAS' | 'MESES' | 'ANIOS' = 'ANIOS';
  plazo_tipo: 'ADMINISTRATIVO' | 'LEGAL' | 'HISTORICO' = 'ADMINISTRATIVO';
  fecha_inicio_conservacion = '';

  loading = false;
  error = '';

  constructor(private readonly documentService: DocumentService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['documento'] && this.documento) {
      this.plazo_valor = this.documento.plazo_valor;
      this.plazo_unidad = this.documento.plazo_unidad || 'ANIOS';
      this.plazo_tipo = this.documento.plazo_tipo || 'ADMINISTRATIVO';
      this.fecha_inicio_conservacion = this.toDateInput(
        this.documento.fecha_inicio_conservacion
      );
      this.error = '';
    }

    if (changes['open'] && !this.open) {
      this.loading = false;
      this.error = '';
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

    const body: AsignarPlazoBody = {
      plazo_valor: this.plazo_valor,
      plazo_unidad: this.plazo_unidad,
      plazo_tipo: this.plazo_tipo,
      fecha_inicio_conservacion: this.fecha_inicio_conservacion
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

  private toDateInput(value: string | null | undefined): string {
    if (!value) return '';
    return value.slice(0, 10);
  }
}
