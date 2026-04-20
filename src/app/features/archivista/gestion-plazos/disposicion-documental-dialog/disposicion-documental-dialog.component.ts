import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import {
  ExpedientePlazoRow,
  GestionPlazosConservacionService,
} from '../../../../../core/services/gestion-plazos-conservacion.service';

/** Valores del combo; listos para enviar al API cuando exista el endpoint. */
export type TipoDisposicionId =
  | 'TRANSFERENCIA_ARCHIVO_NACIONAL'
  | 'ELIMINACION'
  | 'CONSERVACION_PERMANENTE';

@Component({
  selector: 'app-disposicion-documental-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './disposicion-documental-dialog.component.html',
  styleUrls: ['./disposicion-documental-dialog.component.css'],
})
export class DisposicionDocumentalDialogComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() expediente: ExpedientePlazoRow | null = null;

  @Output() closed = new EventEmitter<void>();
  /** Emite cuando el usuario confirma; el padre puede enlazar bitácora / API más adelante. */
  @Output() procesoIniciado = new EventEmitter<{
    expedienteId: number;
    tipo: TipoDisposicionId;
    justificacion: string;
  }>();

  readonly tiposDisposicion: ReadonlyArray<{
    id: TipoDisposicionId;
    label: string;
  }> = [
    {
      id: 'TRANSFERENCIA_ARCHIVO_NACIONAL',
      label: 'Transferencia al Archivo Nacional',
    },
    { id: 'ELIMINACION', label: 'Eliminación' },
    { id: 'CONSERVACION_PERMANENTE', label: 'Conservación Permanente' },
  ];

  tipoSeleccionado: TipoDisposicionId = 'TRANSFERENCIA_ARCHIVO_NACIONAL';
  justificacion = '';

  documentosCount: number | null = null;
  documentosLoading = false;
  documentosLoadFailed = false;

  private documentosSub?: Subscription;

  constructor(
    private readonly gestionPlazos: GestionPlazosConservacionService
  ) {}

  ngOnChanges(_changes: SimpleChanges): void {
    if (!this.open) {
      this.resetLocal();
      return;
    }
    if (this.expediente?.id) {
      this.tipoSeleccionado = 'TRANSFERENCIA_ARCHIVO_NACIONAL';
      this.justificacion = '';
      this.cargarConteoDocumentos();
    }
  }

  ngOnDestroy(): void {
    this.documentosSub?.unsubscribe();
  }

  cerrar(): void {
    this.closed.emit();
  }

  confirmar(): void {
    const id = this.expediente?.id;
    const j = this.justificacion.trim();
    if (!id || !j) {
      return;
    }
    this.procesoIniciado.emit({
      expedienteId: id,
      tipo: this.tipoSeleccionado,
      justificacion: j,
    });
    this.closed.emit();
  }

  get puedeConfirmar(): boolean {
    return (
      !!this.expediente?.id &&
      this.justificacion.trim().length >= 8
    );
  }

  tituloExpediente(): string {
    return this.expediente?.nombre?.trim() || '—';
  }

  codigoExpediente(): string {
    return this.expediente?.codigo?.trim() || '—';
  }

  textoDocumentos(): string {
    if (this.documentosLoading) {
      return 'Cargando…';
    }
    if (this.documentosLoadFailed) {
      return 'No disponible';
    }
    if (this.documentosCount == null) {
      return '—';
    }
    const n = this.documentosCount;
    return `${n} ${n === 1 ? 'documento' : 'documentos'}`;
  }

  private cargarConteoDocumentos(): void {
    const id = this.expediente?.id;
    if (!id) {
      return;
    }
    this.documentosSub?.unsubscribe();
    this.documentosLoading = true;
    this.documentosLoadFailed = false;
    this.documentosCount = null;

    this.documentosSub = this.gestionPlazos
      .getDocumentosByExpedienteId(id)
      .subscribe({
        next: (rows) => {
          this.documentosCount = rows?.length ?? 0;
          this.documentosLoading = false;
        },
        error: () => {
          this.documentosLoading = false;
          this.documentosLoadFailed = true;
          this.documentosCount = null;
        },
      });
  }

  private resetLocal(): void {
    this.documentosSub?.unsubscribe();
    this.documentosSub = undefined;
    this.documentosCount = null;
    this.documentosLoading = false;
    this.documentosLoadFailed = false;
    this.justificacion = '';
    this.tipoSeleccionado = 'TRANSFERENCIA_ARCHIVO_NACIONAL';
  }
}
