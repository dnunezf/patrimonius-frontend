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
import { ToastService } from '../../../../shared/ui/toast.service';

/** Valores del combo; listos para enviar al API cuando exista el endpoint. */
export type TipoDisposicionId = 'TRANSFERENCIA_ARCHIVO_NACIONAL' | 'ELIMINACION';

export type WizardStepDisposicion = 'form' | 'transferApprove' | 'eliminarConfirm';

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
  /** Tras respuesta exitosa del API (HU-032). */
  @Output() procesoIniciado = new EventEmitter<{
    expedienteId: number;
    tipo: TipoDisposicionId;
    justificacion: string;
    /** Si es false, no se abre el diálogo de revisión (p. ej. transferencia ya ejecutada). */
    abrirRevisionTrasCargar: boolean;
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
  ];

  tipoSeleccionado: TipoDisposicionId = 'TRANSFERENCIA_ARCHIVO_NACIONAL';
  justificacion = '';

  step: WizardStepDisposicion = 'form';
  justificacionInicioGuardada = '';
  justificacionAprobacionTransferencia = '';
  apiSavingTransfer = false;
  apiErrorTransfer = '';

  documentosCount: number | null = null;
  documentosLoading = false;
  documentosLoadFailed = false;
  apiError = '';
  apiSaving = false;

  private documentosSub?: Subscription;
  private transferSub?: Subscription;

  private readonly msgTransferenciaGenerica =
    'No se pudo completar la transferencia. Si el problema persiste, revise el detalle del expediente o contacte a soporte.';

  constructor(
    private readonly gestionPlazos: GestionPlazosConservacionService,
    private readonly toasts: ToastService
  ) {}

  ngOnChanges(_changes: SimpleChanges): void {
    if (!this.open) {
      this.resetLocal();
      return;
    }
    if (this.expediente?.id) {
      this.step = 'form';
      this.justificacionInicioGuardada = '';
      this.justificacionAprobacionTransferencia = '';
      this.apiSavingTransfer = false;
      this.apiErrorTransfer = '';
      this.aplicarPoliticaSerieComoDefecto();
      this.justificacion = '';
      this.apiError = '';
      this.apiSaving = false;
      this.cargarConteoDocumentos();
    }
  }

  ngOnDestroy(): void {
    this.documentosSub?.unsubscribe();
    this.transferSub?.unsubscribe();
  }

  cerrar(): void {
    this.closed.emit();
  }

  onBackdropClick(): void {
    if (this.step === 'form') {
      this.cerrar();
    }
  }

  volverAlFormularioDesdePaso(): void {
    this.step = 'form';
    this.apiErrorTransfer = '';
    this.apiSavingTransfer = false;
    this.justificacionAprobacionTransferencia = '';
  }

  /**
   * Desde el formulario principal: avanza a confirmación de transferencia o eliminación (sin API aún).
   */
  avanzarDesdeFormulario(): void {
    const id = this.expediente?.id;
    const j = this.justificacion.trim();
    if (!id || !j || this.apiSaving) {
      return;
    }
    if (this.tipoSeleccionado === 'TRANSFERENCIA_ARCHIVO_NACIONAL') {
      this.justificacionInicioGuardada = j;
      this.step = 'transferApprove';
      this.justificacionAprobacionTransferencia = '';
      this.apiErrorTransfer = '';
      return;
    }
    if (this.tipoSeleccionado === 'ELIMINACION') {
      this.justificacionInicioGuardada = j;
      this.step = 'eliminarConfirm';
    }
  }

  confirmarTransferenciaFinal(): void {
    const id = this.expediente?.id;
    const jAprob = this.justificacionAprobacionTransferencia.trim();
    if (!id || jAprob.length < 8 || this.apiSavingTransfer) {
      return;
    }
    this.apiSavingTransfer = true;
    this.apiErrorTransfer = '';
    this.transferSub?.unsubscribe();
    this.transferSub = this.gestionPlazos
      .ejecutarTransferenciaDisposicionCompleta(id, {
        justificacion_inicio: this.justificacionInicioGuardada,
        justificacion_aprobacion: jAprob,
      })
      .subscribe({
        next: () => {
          this.apiSavingTransfer = false;
          this.procesoIniciado.emit({
            expedienteId: id,
            tipo: 'TRANSFERENCIA_ARCHIVO_NACIONAL',
            justificacion: this.justificacionInicioGuardada,
            abrirRevisionTrasCargar: false,
          });
          this.closed.emit();
          this.intentarDescargarZipEnSegundoPlano(id);
        },
        error: (err) => {
          this.apiSavingTransfer = false;
          this.asignarMensajeErrorHttp(err, this.msgTransferenciaGenerica);
        },
      });
  }

  /**
   * La transferencia ya quedó persistida; la descarga es un paso aparte (si falla, no se revierte el estado).
   */
  private intentarDescargarZipEnSegundoPlano(expedienteId: number): void {
    this.gestionPlazos.descargarPaqueteTransferenciaZip(expedienteId).subscribe({
      next: (blob) => {
        if (this.esProbableJsonDeError(blob)) {
          this.toasts.error(
            'La transferencia se registró, pero el servidor no devolvió el ZIP. Recargue la lista o consulte el detalle del expediente.'
          );
          return;
        }
        this.descargarBlobZip(blob);
        this.toasts.success('Paquete ZIP descargado.');
      },
      error: (err) => {
        const body = (err as { error?: unknown })?.error;
        if (body instanceof Blob) {
          body
            .text()
            .then((t) => {
              const m = this.parseJsonErrorText(t);
              this.toasts.error(
                m ??
                  'La transferencia se registró, pero no se pudo descargar el ZIP. Recargue e intente de nuevo o use el detalle del expediente.'
              );
            })
            .catch(() => {
              this.toasts.error(
                'La transferencia se registró, pero no se pudo descargar el ZIP. Recargue e intente de nuevo o use el detalle del expediente.'
              );
            });
          return;
        }
        this.toasts.error(
          this.mensajeDesdeErrorHttp(err) ??
            'La transferencia se registró, pero no se pudo descargar el ZIP. Recargue e intente de nuevo o use el detalle del expediente.'
        );
      },
    });
  }

  private esProbableJsonDeError(blob: Blob): boolean {
    if (blob.size > 512) {
      return false;
    }
    const t = blob.type || '';
    return t.includes('json') || t === '' || t === 'text/plain';
  }

  private asignarMensajeErrorHttp(err: unknown, fallback: string): void {
    const body = (err as { error?: unknown })?.error;
    if (body instanceof Blob) {
      body.text().then((t) => {
        this.apiErrorTransfer = this.parseJsonErrorText(t) ?? fallback;
      }).catch(() => {
        this.apiErrorTransfer = fallback;
      });
      return;
    }
    const o = err as { error?: { error?: string; message?: string } };
    this.apiErrorTransfer = o?.error?.error || o?.error?.message || fallback;
  }

  private mensajeDesdeErrorHttp(err: unknown): string | null {
    const body = (err as { error?: unknown })?.error;
    if (body instanceof Blob) {
      return null;
    }
    const o = err as { error?: { error?: string; message?: string } };
    return o?.error?.error || o?.error?.message || null;
  }

  private parseJsonErrorText(t: string): string | null {
    try {
      const j = JSON.parse(t) as { error?: string; message?: string };
      return j.error || j.message || null;
    } catch {
      return t.trim() || null;
    }
  }

  private descargarBlobZip(blob: Blob): void {
    const codigo = this.expediente?.codigo?.trim() || 'expediente';
    const safe = codigo.replace(/[^a-zA-Z0-9._-]/g, '_');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safe}-transferencia.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  cerrarConfirmacionEliminacion(): void {
    this.toasts.info(
      'La eliminación definitiva del expediente aún no está habilitada; el museo definirá el procedimiento.'
    );
    this.step = 'form';
    this.closed.emit();
  }

  cancelarConfirmacionEliminacion(): void {
    this.step = 'form';
  }

  get puedeAvanzarDesdeFormulario(): boolean {
    return (
      !!this.expediente?.id &&
      this.justificacion.trim().length >= 8 &&
      !this.apiSaving &&
      this.step === 'form'
    );
  }

  get puedeConfirmarTransferencia(): boolean {
    return (
      !!this.expediente?.id &&
      this.justificacionAprobacionTransferencia.trim().length >= 8 &&
      !this.apiSavingTransfer
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

  get tiposFiltrados(): ReadonlyArray<{ id: TipoDisposicionId; label: string }> {
    const p = String(this.expediente?.politica_disposicion ?? '')
      .trim()
      .toUpperCase();
    if (!p) {
      return this.tiposDisposicion;
    }
    if (p === 'CONSERVACION_PERMANENTE') {
      return this.tiposDisposicion;
    }
    const map: Record<string, TipoDisposicionId> = {
      ELIMINACION: 'ELIMINACION',
      TRANSFERENCIA: 'TRANSFERENCIA_ARCHIVO_NACIONAL',
    };
    const id = map[p];
    if (!id) {
      return this.tiposDisposicion;
    }
    return this.tiposDisposicion.filter((t) => t.id === id);
  }

  private aplicarPoliticaSerieComoDefecto(): void {
    const p = String(this.expediente?.politica_disposicion ?? '')
      .trim()
      .toUpperCase();
    if (p === 'ELIMINACION') {
      this.tipoSeleccionado = 'ELIMINACION';
    } else if (p === 'TRANSFERENCIA') {
      this.tipoSeleccionado = 'TRANSFERENCIA_ARCHIVO_NACIONAL';
    } else if (p === 'CONSERVACION_PERMANENTE') {
      this.tipoSeleccionado = 'TRANSFERENCIA_ARCHIVO_NACIONAL';
    } else {
      this.tipoSeleccionado = 'TRANSFERENCIA_ARCHIVO_NACIONAL';
    }
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
    this.transferSub?.unsubscribe();
    this.documentosSub = undefined;
    this.transferSub = undefined;
    this.documentosCount = null;
    this.documentosLoading = false;
    this.documentosLoadFailed = false;
    this.justificacion = '';
    this.tipoSeleccionado = 'TRANSFERENCIA_ARCHIVO_NACIONAL';
    this.apiError = '';
    this.apiSaving = false;
    this.step = 'form';
    this.justificacionInicioGuardada = '';
    this.justificacionAprobacionTransferencia = '';
    this.apiSavingTransfer = false;
    this.apiErrorTransfer = '';
  }
}
