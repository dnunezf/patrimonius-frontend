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
  selector: 'app-rechazar-disposicion-expediente-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rechazar-disposicion-expediente-dialog.component.html',
  styleUrls: ['./rechazar-disposicion-expediente-dialog.component.css'],
})
export class RechazarDisposicionExpedienteDialogComponent implements OnChanges {
  @Input() open = false;
  @Input() expediente: ExpedientePlazoRow | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() disposicionRechazada = new EventEmitter<void>();

  motivo = '';
  saving = false;
  errorMsg = '';

  constructor(
    private readonly plazos: GestionPlazosConservacionService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.motivo = '';
      this.saving = false;
      this.errorMsg = '';
    }
  }

  cerrar(): void {
    this.closed.emit();
  }

  get puedeConfirmar(): boolean {
    return this.motivo.trim().length >= 8 && !this.saving && !!this.expediente?.id;
  }

  confirmar(): void {
    const id = this.expediente?.id;
    if (!id || !this.puedeConfirmar) {
      return;
    }
    this.saving = true;
    this.errorMsg = '';
    this.plazos
      .rechazarDisposicionExpediente(id, { motivo: this.motivo.trim() })
      .subscribe({
        next: () => {
          this.saving = false;
          this.disposicionRechazada.emit();
          this.closed.emit();
        },
        error: (err) => {
          this.saving = false;
          this.errorMsg =
            err?.error?.error || 'No se pudo registrar el rechazo de la disposición.';
        },
      });
  }
}
