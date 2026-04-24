import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule, NgClass, NgFor, NgIf } from '@angular/common';

import { ConfirmService } from '../../../../../shared/ui/confirm.service';
import { ToastService } from '../../../../../shared/ui/toast.service';
import { ConservationIntakeService } from '../../../../../../core/services/conservation-intake.service';
import {
  ConservationEadDocumentRow,
  EadPreviewResponse,
  EadPreviewTreeNode,
  EadPreviewValidationItem,
} from '../../models';

type EadDialogState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'exporting'
  | 'done'
  | 'error';

@Component({
  selector: 'app-ead-export-dialog',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, NgClass],
  templateUrl: './ead-export-dialog.component.html',
  styleUrls: ['./ead-export-dialog.component.css'],
})
export class EadExportDialogComponent implements OnChanges {
  @Input() open = false;
  @Input() document: ConservationEadDocumentRow | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() exported = new EventEmitter<number>();

  private readonly api = inject(ConservationIntakeService);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  state: EadDialogState = 'idle';

  preview: EadPreviewResponse | null = null;

  errorMessage: string | null = null;

  validationProgress = 0;
  validationStatusText =
    'Preparando validación de requisitos para exportación EAD 2002.';

  showStructure = true;

  exportCompleted = false;
  exportedFileName: string | null = null;
  exportedAtISO: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    const openChanged = !!changes['open'];
    const documentChanged = !!changes['document'];

    if (!this.open) {
      if (openChanged) {
        this.resetState();
      }
      return;
    }

    if ((openChanged || documentChanged) && this.document?.id) {
      this.loadPreview();
    }
  }

  retryPreview(): void {
    this.loadPreview();
  }

  toggleStructure(): void {
    this.showStructure = !this.showStructure;
  }

  canShowReadyContent(): boolean {
    return !!this.preview && (this.state === 'ready' || this.state === 'done');
  }

  validationBadgeClass(item: EadPreviewValidationItem): string {
    return item.valid ? 'ok' : 'bad';
  }

  trackValidation(_: number, item: EadPreviewValidationItem): string {
    return item.key;
  }

  trackNode(index: number, node: EadPreviewTreeNode): string {
    return `${index}-${node.tag}-${node.label}`;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('es-CR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  formatShortDate(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('es-CR', {
      dateStyle: 'medium',
    }).format(date);
  }

  close(): void {
    if (this.state === 'exporting') return;
    this.resetState();
    this.closed.emit();
  }

  loadPreview(): void {
    const doc = this.document;
    if (!doc?.id) return;

    this.state = 'loading';
    this.preview = null;
    this.errorMessage = null;
    this.exportCompleted = false;
    this.exportedFileName = null;
    this.exportedAtISO = null;

    this.validationProgress = 25;
    this.validationStatusText =
      'Validando estado del documento, metadatos y estructura archivística.';

    this.api
      .audit('EAD2002_PREVIEW_REQUESTED', {
        documentId: doc.id,
        officialCode: doc.officialCode,
      })
      .subscribe();

    this.api.getEadExportPreview(doc.id).subscribe({
      next: (response) => {
        this.preview = response;
        this.state = 'ready';
        this.validationProgress = 100;
        this.validationStatusText = response.canExport
          ? 'El documento cumple los requisitos para exportación EAD 2002.'
          : 'El documento tiene validaciones pendientes antes de exportar.';

        this.api
          .audit('EAD2002_PREVIEW_SUCCESS', {
            documentId: doc.id,
            canExport: response.canExport,
            validations: response.validations?.length ?? 0,
          })
          .subscribe();
      },
      error: (err) => {
        this.state = 'error';
        this.validationProgress = 0;
        this.errorMessage =
          err?.error?.message ||
          'No se pudo generar la vista previa de exportación EAD 2002.';
        this.validationStatusText =
          'Ocurrió un error al validar el documento para exportación.';

        this.api
          .audit('EAD2002_PREVIEW_FAILED', {
            documentId: doc.id,
            status: err?.status ?? null,
            message: this.errorMessage,
          })
          .subscribe();
      },
    });
  }

  async exportXml(): Promise<void> {
    const doc = this.document;
    if (!doc?.id) {
      this.toasts.error('No se encontró el documento a exportar.');
      return;
    }

    if (!this.preview) {
      this.toasts.error('Primero debe cargarse la vista previa EAD 2002.');
      return;
    }

    if (!this.preview.canExport) {
      this.toasts.error(
        'El documento no puede exportarse porque tiene validaciones pendientes.',
      );
      return;
    }

    const confirmed = await this.confirm.ask(
      '¿Confirma la exportación del documento en formato XML EAD 2002?',
      'Confirmar exportación',
    );

    if (!confirmed) {
      this.api
        .audit('EAD2002_EXPORT_CANCELLED', {
          documentId: doc.id,
          officialCode: doc.officialCode,
        })
        .subscribe();
      return;
    }

    this.state = 'exporting';
    this.validationProgress = 85;
    this.validationStatusText =
      'Generando archivo XML y registrando la exportación en bitácora.';

    this.api
      .audit('EAD2002_EXPORT_REQUESTED', {
        documentId: doc.id,
        officialCode: doc.officialCode,
      })
      .subscribe();

    this.api.exportEadXml(doc.id).subscribe({
      next: (response) => {
        const fileName =
          response.fileName || `${doc.officialCode || 'documento'}-ead2002.xml`;

        this.downloadBlob(response.blob, fileName);

        this.state = 'done';
        this.validationProgress = 100;
        this.validationStatusText =
          'La exportación EAD 2002 se completó correctamente.';

        this.exportCompleted = true;
        this.exportedFileName = fileName;
        this.exportedAtISO = new Date().toISOString();

        this.toasts.success(`Exportación EAD 2002 completada: ${fileName}`);

        this.api
          .audit('EAD2002_EXPORT_SUCCESS', {
            documentId: doc.id,
            officialCode: doc.officialCode,
            fileName,
          })
          .subscribe();

        this.exported.emit(doc.id);
      },
      error: (err) => {
        this.state = 'error';
        this.validationProgress = 0;
        this.errorMessage =
          err?.error?.message || 'No se pudo exportar el archivo XML EAD 2002.';
        this.validationStatusText =
          'La exportación falló. Revise la validación del documento e intente de nuevo.';

        if (err?.status === 401) {
          this.toasts.error('La sesión expiró. Inicie sesión nuevamente.');
          return;
        }

        if (err?.status === 403) {
          this.toasts.error(
            'No tiene permisos para exportar documentos en EAD 2002.',
          );
          return;
        }

        if (err?.status === 404) {
          this.toasts.error('El documento seleccionado ya no está disponible.');
          return;
        }

        const message =
          err?.error?.message || 'No se pudo exportar el archivo XML EAD 2002.';

        this.errorMessage = message;
        this.toasts.error(message);

        this.api
          .audit('EAD2002_EXPORT_FAILED', {
            documentId: doc.id,
            officialCode: doc.officialCode,
            status: err?.status ?? null,
            message: this.errorMessage,
          })
          .subscribe();
      },
    });
  }

  private resetState(): void {
    this.state = 'idle';
    this.preview = null;
    this.errorMessage = null;
    this.validationProgress = 0;
    this.validationStatusText =
      'Preparando validación de requisitos para exportación EAD 2002.';
    this.showStructure = true;
    this.exportCompleted = false;
    this.exportedFileName = null;
    this.exportedAtISO = null;
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');

    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.style.display = 'none';

    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
  }
}
