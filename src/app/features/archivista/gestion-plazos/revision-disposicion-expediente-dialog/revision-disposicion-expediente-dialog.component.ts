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
  selector: 'app-revision-disposicion-expediente-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './revision-disposicion-expediente-dialog.component.html',
  styleUrls: ['./revision-disposicion-expediente-dialog.component.css'],
})
export class RevisionDisposicionExpedienteDialogComponent implements OnChanges {
  @Input() open = false;
  @Input() expediente: ExpedientePlazoRow | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() revisionGuardada = new EventEmitter<void>();

  metadatosOk = false;
  firmaOk = false;
  plazoOk = false;
  politicaOk = false;
  notas = '';

  saving = false;
  errorMsg = '';

  constructor(
    private readonly plazos: GestionPlazosConservacionService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
    }
  }

  cerrar(): void {
    this.closed.emit();
  }

  get puedeCompletar(): boolean {
    return (
      this.metadatosOk &&
      this.firmaOk &&
      this.plazoOk &&
      this.politicaOk &&
      !this.saving &&
      !!this.expediente?.id
    );
  }

  etiquetaAccion(): string {
    const t = String(this.expediente?.disposicion_tipo ?? '').toUpperCase();
    if (t === 'ELIMINACION') return 'Eliminar';
    if (t === 'TRANSFERENCIA') return 'Transferencia (ZIP)';
    if (t === 'CONSERVACION_PERMANENTE') return 'Conservación permanente';
    return '—';
  }

  guardar(): void {
    const id = this.expediente?.id;
    if (!id || !this.puedeCompletar) {
      return;
    }
    this.saving = true;
    this.errorMsg = '';
    this.plazos
      .registrarRevisionDisposicion(id, {
        checklist: {
          metadatos_ok: this.metadatosOk,
          firma_ok: this.firmaOk,
          plazo_ok: this.plazoOk,
          politica_ok: this.politicaOk,
        },
        notas: this.notas.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.revisionGuardada.emit();
          this.closed.emit();
        },
        error: (err) => {
          this.saving = false;
          this.errorMsg =
            err?.error?.error || 'No se pudo registrar la revisión del expediente.';
        },
      });
  }

  private reset(): void {
    this.metadatosOk = false;
    this.firmaOk = false;
    this.plazoOk = false;
    this.politicaOk = false;
    this.notas = '';
    this.saving = false;
    this.errorMsg = '';
  }
}
