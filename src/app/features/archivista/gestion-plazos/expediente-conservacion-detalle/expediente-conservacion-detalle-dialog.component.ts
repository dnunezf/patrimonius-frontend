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
import { Subscription } from 'rxjs';

import {
  BitacoraExpedienteItem,
  ExpedienteDocumentoListRow,
  ExpedientePlazoRow,
  GestionPlazosConservacionService,
} from '../../../../../core/services/gestion-plazos-conservacion.service';
import { ToastService } from '../../../../shared/ui/toast.service';

@Component({
  selector: 'app-expediente-conservacion-detalle-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './expediente-conservacion-detalle-dialog.component.html',
  styleUrls: ['./expediente-conservacion-detalle-dialog.component.css'],
})
export class ExpedienteConservacionDetalleDialogComponent
  implements OnChanges, OnDestroy
{
  @Input() open = false;
  @Input() expediente: ExpedientePlazoRow | null = null;

  @Output() closed = new EventEmitter<void>();

  readonly sinDato = '—';

  documentos: ExpedienteDocumentoListRow[] = [];
  documentosLoading = false;
  documentosError = '';

  bitacora: BitacoraExpedienteItem[] = [];
  bitacoraLoading = false;
  bitacoraError = '';

  politicaDisposicion: string | null = null;
  disposicionEstado: string | null = null;
  disposicionTipo: string | null = null;

  private documentosSub?: Subscription;
  private bitacoraSub?: Subscription;

  constructor(
    private readonly gestionPlazos: GestionPlazosConservacionService,
    private readonly toasts: ToastService,
  ) {}

  ngOnChanges(_changes: SimpleChanges): void {
    if (!this.open) {
      this.resetDocumentos();
      return;
    }

    if (this.expediente?.id) {
      this.cargarDocumentos();
      this.cargarBitacoraYDisposicion();
    }
  }

  ngOnDestroy(): void {
    this.documentosSub?.unsubscribe();
    this.bitacoraSub?.unsubscribe();
  }

  cerrar(): void {
    this.closed.emit();
  }

  fechaCreacionFormateada(): string {
    return this.formatearFechaLarga(this.expediente?.fecha_creacion);
  }

  fechaInicioVigenciaFormateada(): string {
    return this.formatearFechaLarga(this.expediente?.fecha_inicio_vigencia);
  }

  fechaVencimientoFormateada(): string {
    return this.formatearFechaLarga(this.expediente?.fecha_vencimiento);
  }

  fechaCierreFormateada(): string {
    return this.formatearFechaLarga(this.expediente?.fecha_cierre);
  }

  private formatearFechaLarga(iso: string | null | undefined): string {
    if (!iso) {
      return this.sinDato;
    }

    try {
      return new Intl.DateTimeFormat('es', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(iso));
    } catch {
      return this.sinDato;
    }
  }

  getEstadoClass(estado: string | null | undefined): string {
    switch (estado) {
      case 'CERRADO':
        return 'estado-pill estado-pill--cerrado';
      case 'TRANSFERIDO':
        return 'estado-pill estado-pill--transferido';
      case 'ELIMINADO':
        return 'estado-pill estado-pill--eliminado';
      default:
        return 'estado-pill';
    }
  }

  documentoEstadoClass(estado: string | null | undefined): string {
    const e = String(estado || '').toUpperCase();

    if (e === 'CREACION') return 'conservacion-doc-pill';
    if (e === 'EDICION') {
      return 'conservacion-doc-pill conservacion-doc-pill--info';
    }
    if (e === 'FIRMA' || e === 'FIRMA_PARCIAL') {
      return 'conservacion-doc-pill conservacion-doc-pill--warn';
    }
    if (e === 'APROBADO' || e === 'ARCHIVADO') {
      return 'conservacion-doc-pill conservacion-doc-pill--ok';
    }
    if (e === 'ELIMINACION' || e === 'TRANSFERENCIA') {
      return 'conservacion-doc-pill conservacion-doc-pill--danger';
    }

    return 'conservacion-doc-pill';
  }

  private cargarDocumentos(): void {
    const id = this.expediente?.id;
    if (!id) {
      return;
    }

    this.documentosSub?.unsubscribe();
    this.documentosLoading = true;
    this.documentosError = '';
    this.documentos = [];

    this.documentosSub = this.gestionPlazos
      .getDocumentosByExpedienteId(id)
      .subscribe({
        next: (rows) => {
          this.documentos = rows ?? [];
          this.documentosLoading = false;
        },
        error: (err) => {
          this.documentosLoading = false;
          this.documentosError =
            err?.error?.message ||
            'No se pudieron cargar los documentos del expediente.';
        },
      });
  }

  private resetDocumentos(): void {
    this.documentosSub?.unsubscribe();
    this.documentosSub = undefined;
    this.documentos = [];
    this.documentosLoading = false;
    this.documentosError = '';

    this.bitacoraSub?.unsubscribe();
    this.bitacoraSub = undefined;
    this.bitacora = [];
    this.bitacoraLoading = false;
    this.bitacoraError = '';

    this.politicaDisposicion = null;
    this.disposicionEstado = null;
    this.disposicionTipo = null;
  }

  textoPoliticaDisposicion(): string {
    const p = String(this.politicaDisposicion ?? '').trim();
    if (!p) return this.sinDato;
    if (p === 'ELIMINACION') return 'Eliminación';
    if (p === 'TRANSFERENCIA') return 'Transferencia (ZIP + EAD 2002)';
    if (p === 'CONSERVACION_PERMANENTE') return 'Conservación permanente';
    return p;
  }

  textoTipoDisposicion(): string {
    const t = String(this.disposicionTipo ?? '')
      .trim()
      .toUpperCase();
    if (!t) return this.sinDato;
    if (t === 'ELIMINACION') return 'Eliminación';
    if (t === 'TRANSFERENCIA') return 'Transferencia (ZIP + EAD 2002)';
    if (t === 'CONSERVACION_PERMANENTE') return 'Conservación permanente';
    return t;
  }

  eventoBitacoraLegible(ev: string): string {
    const u = String(ev || '').toUpperCase();
    const map: Record<string, string> = {
      CREACION: 'Creación',
      ACTUALIZACION: 'Actualización / trámite',
      CIERRE: 'Cierre',
      ELIMINACION: 'Eliminación',
      TRANSFERENCIA: 'Transferencia',
      ABRIR: 'Apertura',
    };
    return map[u] || ev || '—';
  }

  fechaHoraBitacora(iso: string): string {
    try {
      return new Intl.DateTimeFormat('es', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  private cargarBitacoraYDisposicion(): void {
    const id = this.expediente?.id;
    if (!id) {
      return;
    }

    this.bitacoraSub?.unsubscribe();
    this.bitacoraLoading = true;
    this.bitacoraError = '';
    this.bitacora = [];

    this.bitacoraSub = this.gestionPlazos
      .getDetalleConservacionExpediente(id)
      .subscribe({
        next: (res) => {
          this.bitacora = res?.bitacora ?? [];
          this.politicaDisposicion =
            res?.expediente?.politica_disposicion ?? null;
          this.disposicionEstado = res?.disposicion?.estado ?? null;
          this.disposicionTipo = res?.disposicion?.tipo ?? null;
          this.bitacoraLoading = false;
        },
        error: (err) => {
          this.bitacoraLoading = false;
          this.bitacoraError =
            err?.error?.error ||
            'No se pudo cargar la bitácora del expediente.';
        },
      });
  }

  canDownloadTransferZip(): boolean {
    const ex = this.expediente;
    if (!ex) return false;

    const hasPath = !!String(ex.paquete_transferencia_zip_path ?? '').trim();
    const estado = String(ex.estado ?? '')
      .trim()
      .toUpperCase();
    const dis = String(ex.disposicion_estado ?? '')
      .trim()
      .toUpperCase();

    return (
      hasPath ||
      estado === 'TRANSFERIDO' ||
      dis === 'DISPOSICION_EJECUTADA_TRANSFERENCIA'
    );
  }

  canDownloadActaEliminacion(): boolean {
    const ex = this.expediente;
    if (!ex) return false;

    const hasCode = !!String(ex.acta_eliminacion_codigo ?? '').trim();
    const estado = String(ex.estado ?? '')
      .trim()
      .toUpperCase();
    const dis = String(ex.disposicion_estado ?? '')
      .trim()
      .toUpperCase();

    return (
      hasCode ||
      estado === 'ELIMINADO' ||
      dis === 'DISPOSICION_EJECUTADA_ELIMINACION'
    );
  }

  mostrarBloqueArtefactos(): boolean {
    return this.canDownloadTransferZip() || this.canDownloadActaEliminacion();
  }

  resumenArtefactos(): string {
    if (this.canDownloadTransferZip()) {
      return 'Se encuentra disponible el paquete de transferencia documental generado por el flujo HU-032/HU-035.';
    }
    if (this.canDownloadActaEliminacion()) {
      return 'Se encuentra disponible el acta oficial de eliminación generada por el flujo HU-032.';
    }
    return this.sinDato;
  }

  descargarPaqueteTransferencia(): void {
    const id = this.expediente?.id;
    const codigo = this.codigoSeguro(this.expediente?.codigo);

    if (!id) {
      return;
    }

    this.gestionPlazos.descargarPaqueteTransferenciaZip(id).subscribe({
      next: (blob) => {
        if (this.esProbableJsonDeError(blob)) {
          this.intentarMostrarErrorBlob(
            blob,
            'No se pudo descargar el paquete ZIP de transferencia.',
          );
          return;
        }

        this.descargarBlob(blob, `${codigo}-transferencia-ead2002.zip`);
        this.toasts.success(
          'Paquete ZIP con metadata EAD 2002 descargado correctamente.',
        );
      },
      error: (err) => {
        this.mostrarErrorHttp(
          err,
          'No se pudo descargar el paquete ZIP de transferencia.',
        );
      },
    });
  }

  descargarActaEliminacion(): void {
    const id = this.expediente?.id;
    const codigo = this.codigoSeguro(this.expediente?.codigo);

    if (!id) {
      return;
    }

    this.gestionPlazos.descargarActaEliminacionDocx(id).subscribe({
      next: (blob) => {
        if (this.esProbableJsonDeError(blob)) {
          this.intentarMostrarErrorBlob(
            blob,
            'No se pudo descargar el acta de eliminación.',
          );
          return;
        }

        this.descargarBlob(blob, `${codigo}-acta-eliminacion.docx`);
        this.toasts.success('Acta de eliminación descargada correctamente.');
      },
      error: (err) => {
        this.mostrarErrorHttp(
          err,
          'No se pudo descargar el acta de eliminación.',
        );
      },
    });
  }

  private descargarBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  private codigoSeguro(value: string | null | undefined): string {
    const raw = String(value || 'expediente').trim() || 'expediente';
    return raw.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private esProbableJsonDeError(blob: Blob): boolean {
    if (!blob) return true;
    const type = String(blob.type || '').toLowerCase();
    return type.includes('json') || type.includes('text/plain');
  }

  private intentarMostrarErrorBlob(blob: Blob, fallback: string): void {
    blob
      .text()
      .then((text) => {
        const msg = this.parseJsonErrorText(text);
        this.toasts.error(msg || fallback);
      })
      .catch(() => {
        this.toasts.error(fallback);
      });
  }

  private mostrarErrorHttp(err: unknown, fallback: string): void {
    const body = (err as { error?: unknown })?.error;

    if (body instanceof Blob) {
      this.intentarMostrarErrorBlob(body, fallback);
      return;
    }

    const parsed = err as { error?: { error?: string; message?: string } };
    this.toasts.error(
      parsed?.error?.error || parsed?.error?.message || fallback,
    );
  }

  private parseJsonErrorText(text: string): string | null {
    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string };
      return parsed.error || parsed.message || null;
    } catch {
      const trimmed = String(text || '').trim();
      return trimmed || null;
    }
  }
}
