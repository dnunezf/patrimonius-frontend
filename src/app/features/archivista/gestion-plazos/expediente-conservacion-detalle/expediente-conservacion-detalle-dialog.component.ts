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
  ExpedienteDocumentoListRow,
  ExpedientePlazoRow,
  GestionPlazosConservacionService,
} from '../../../../../core/services/gestion-plazos-conservacion.service';

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

  /** Campos sin API por ahora (marcados en la maqueta). */
  readonly sinDato = '—';

  documentos: ExpedienteDocumentoListRow[] = [];
  documentosLoading = false;
  documentosError = '';

  private documentosSub?: Subscription;

  constructor(
    private readonly gestionPlazos: GestionPlazosConservacionService
  ) {}

  ngOnChanges(_changes: SimpleChanges): void {
    if (!this.open) {
      this.resetDocumentos();
      return;
    }
    if (this.expediente?.id) {
      this.cargarDocumentos();
    }
  }

  ngOnDestroy(): void {
    this.documentosSub?.unsubscribe();
  }

  cerrar(): void {
    this.closed.emit();
  }

  fechaArchivoFormateada(): string {
    const fc = this.expediente?.fecha_cierre;
    if (!fc) {
      return this.sinDato;
    }
    try {
      return new Intl.DateTimeFormat('es', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(fc));
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
    if (e === 'EDICION') return 'conservacion-doc-pill conservacion-doc-pill--info';
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
  }
}
