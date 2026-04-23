import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  ExpedientePlazoRow,
  GestionPlazosConservacionService,
} from '../../../../../core/services/gestion-plazos-conservacion.service';

@Component({
  selector: 'app-aprobar-disposicion-expediente-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './aprobar-disposicion-expediente-dialog.component.html',
  styleUrls: ['./aprobar-disposicion-expediente-dialog.component.css'],
})
export class AprobarDisposicionExpedienteDialogComponent implements OnChanges {
  @Input() open = false;
  @Input() expediente: ExpedientePlazoRow | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() disposicionAprobada = new EventEmitter<void>();

  justificacion = '';
  saving = false;
  errorMsg = '';

  constructor(
    private readonly plazos: GestionPlazosConservacionService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.justificacion = '';
      this.saving = false;
      this.errorMsg = '';
    }
  }

  cerrar(): void {
    this.closed.emit();
  }

  etiquetaAccion(): string {
    const t = String(this.expediente?.disposicion_tipo ?? '').toUpperCase();
    if (t === 'ELIMINACION') return 'Eliminar';
    if (t === 'TRANSFERENCIA') return 'Transferencia (paquete ZIP)';
    if (t === 'CONSERVACION_PERMANENTE') return 'Conservación permanente';
    return '—';
  }

  get puedeAprobar(): boolean {
    return (
      this.justificacion.trim().length >= 8 &&
      !this.saving &&
      !!this.expediente?.id
    );
  }

  confirmar(): void {
    const id = this.expediente?.id;
    if (!id || !this.puedeAprobar) {
      return;
    }
    this.saving = true;
    this.errorMsg = '';
    this.plazos
      .aprobarDisposicionExpediente(id, {
        justificacion: this.justificacion.trim(),
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.disposicionAprobada.emit();
          this.closed.emit();
        },
        error: (err) => {
          this.saving = false;
          this.errorMsg =
            err?.error?.error || 'No se pudo aprobar la disposición del expediente.';
        },
      });
  }
}
