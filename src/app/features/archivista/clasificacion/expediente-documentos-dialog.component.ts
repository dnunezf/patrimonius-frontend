import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface ExpedienteDocumentoDialogRow {
  id: number;
  titulo: string;
  estado: string;
  numero_serie?: string | null;
  expediente_id?: number | null;
}

@Component({
  selector: 'app-expediente-documentos-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './expediente-documentos-dialog.component.html',
  styleUrls: ['./expediente-documentos-dialog.component.css'],
})
export class ExpedienteDocumentosDialogComponent {
  @Input() open = false;
  @Input() expedienteNombre = '';
  @Input() documentos: ExpedienteDocumentoDialogRow[] = [];
  @Input() loading = false;
  @Input() errorMsg = '';

  @Output() closed = new EventEmitter<void>();
  @Output() clasificar = new EventEmitter<ExpedienteDocumentoDialogRow>();

  close(): void {
    this.closed.emit();
  }

  onClasificar(doc: ExpedienteDocumentoDialogRow): void {
    this.clasificar.emit(doc);
  }

  estadoClass(estado: string | null | undefined): string {
    const e = String(estado || '').toUpperCase();

    if (e === 'CREACION') return 'pill';
    if (e === 'EDICION') return 'pill info';
    if (e === 'FIRMA' || e === 'FIRMA_PARCIAL') return 'pill warn';
    if (e === 'APROBADO') return 'pill ok';
    if (e === 'ARCHIVADO') return 'pill ok';
    if (e === 'ELIMINACION' || e === 'TRANSFERENCIA') return 'pill danger';

    return 'pill';
  }
}
