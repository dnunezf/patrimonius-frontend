import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, NgClass, NgFor, NgIf } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { ConservationEadDocumentRow } from '../../models';
import {
  ConservationDispatchDetail,
  ConservationIntakeService,
  DispatchAttachment,
  DispatchEmailPayload,
} from '../../../../../../core/services/conservation-intake.service';
import { ToastService } from '../../../../../shared/ui/toast.service';
import { ConfirmService } from '../../../../../shared/ui/confirm.service';

function csvToUniqueArray(value: string): string[] {
  return String(value || '')
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index);
}

function commaEmailsValidator(required = false): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value || '').trim();

    if (!value) {
      return required ? { required: true } : null;
    }

    const emails = csvToUniqueArray(value);

    if (!emails.length) {
      return required ? { required: true } : null;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emails.every((email) => emailRegex.test(email))
      ? null
      : { emails: true };
  };
}

function humanSize(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes)) return '—';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = Number(bytes);
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

@Component({
  selector: 'app-dispatch-email-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIf, NgFor, NgClass],
  templateUrl: './dispatch-email-dialog.component.html',
  styleUrls: ['./dispatch-email-dialog.component.css'],
})
export class DispatchEmailDialogComponent implements OnChanges {
  private readonly api = inject(ConservationIntakeService);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  @Input() open = false;
  @Input() document: ConservationEadDocumentRow | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() sent = new EventEmitter<number>();

  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly previewOpen = signal(false);

  readonly detail = signal<ConservationDispatchDetail | null>(null);
  readonly selectedAttachmentIds = signal<number[]>([]);

  readonly dispatchForm = this.fb.group({
    to: ['', [commaEmailsValidator(true)]],
    cc: ['', [commaEmailsValidator(false)]],
    subject: ['', [Validators.required]],
    message: ['', [Validators.required]],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] || changes['document']) {
      if (this.open && this.document) {
        this.prepareDialog(this.document);
      }

      if (!this.open) {
        this.resetDialog();
      }
    }
  }

  private prepareDialog(row: ConservationEadDocumentRow): void {
    this.loading.set(true);
    this.previewOpen.set(false);
    this.detail.set(null);
    this.selectedAttachmentIds.set([]);

    this.dispatchForm.reset({
      to: '',
      cc: '',
      subject: `[${row.officialCode || 'SIN-CÓDIGO'}] ${row.title || ''}`,
      message: this.buildDefaultMessage({
        officialCode: row.officialCode,
        title: row.title,
        documentType: null,
        producingUnit: null,
      }),
    });

    this.api.getDispatchDetail(row.id).subscribe({
      next: (detail) => {
        this.loading.set(false);
        this.detail.set(detail);

        const defaultTo = detail.document.dispatchEmails?.join(', ') || '';
        const subject = `[${detail.document.officialCode || row.officialCode || 'SIN-CÓDIGO'}] ${
          detail.document.title || row.title || ''
        }`;

        this.dispatchForm.patchValue({
          to: defaultTo,
          subject,
          message: this.buildDefaultMessage({
            officialCode: detail.document.officialCode || row.officialCode,
            title: detail.document.title || row.title,
            documentType: detail.document.documentType,
            producingUnit: detail.document.producingUnit,
          }),
        });

        const mainDocument = detail.attachments.find(
          (item) => item.isMainDocument || item.required,
        );

        const selectedIds = detail.attachments
          .filter((item) => item.isMainDocument || item.required || item.selectedByDefault)
          .map((item) => item.id)
          .filter((id) => id !== null && id !== undefined);

        if (mainDocument && !selectedIds.includes(mainDocument.id)) {
          selectedIds.unshift(mainDocument.id);
        }

        this.selectedAttachmentIds.set(selectedIds);
      },
      error: (err) => {
        this.loading.set(false);

        this.toasts.error(
          err?.error?.message ||
          'No se pudo cargar la información para el despacho por correo.',
        );

        this.close();
      },
    });
  }

  private resetDialog(): void {
    this.loading.set(false);
    this.sending.set(false);
    this.previewOpen.set(false);
    this.detail.set(null);
    this.selectedAttachmentIds.set([]);
    this.dispatchForm.reset({
      to: '',
      cc: '',
      subject: '',
      message: '',
    });
  }

  private buildDefaultMessage(data: {
    officialCode?: string | null;
    title?: string | null;
    documentType?: string | null;
    producingUnit?: string | null;
  }): string {
    const title = data.title || '—';
    const code = data.officialCode || '—';
    const type = data.documentType || '—';
    const unit = data.producingUnit || '—';

    return `Estimado/a,

Adjunto encontrará el documento: ${title}

Código: ${code}
Tipo: ${type}
Unidad emisora: ${unit}

Saludos.`;
  }

  close(): void {
    if (this.sending()) return;
    this.closed.emit();
  }

  async send(): Promise<void> {
    const row = this.document;
    const detail = this.detail();

    if (!row || !detail) {
      this.toasts.error('No se encontró el documento seleccionado.');
      return;
    }

    this.dispatchForm.markAllAsTouched();

    if (this.dispatchForm.invalid) {
      this.toasts.error('Complete los datos obligatorios del correo.');
      return;
    }

    const raw = this.dispatchForm.getRawValue();

    const payload: DispatchEmailPayload = {
      to: csvToUniqueArray(String(raw.to || '')).map((item) =>
        item.toLowerCase(),
      ),
      cc: csvToUniqueArray(String(raw.cc || '')).map((item) =>
        item.toLowerCase(),
      ),
      subject: String(raw.subject || '').trim(),
      message: String(raw.message || '').trim(),
      attachmentIds: this.selectedAttachmentIds(),
    };

    const main = this.mainDocument();

    if (!main || !payload.attachmentIds.includes(main.id)) {
      this.toasts.error('Debe incluirse el documento principal en el correo.');
      return;
    }

    const confirmed = await this.confirm.ask(
      `¿Desea enviar este documento a ${payload.to.join(', ')}?`,
      'Confirmar envío por correo',
    );

    if (!confirmed) return;

    this.sending.set(true);

    this.api.sendDispatchEmail(row.id, payload).subscribe({
      next: (response) => {
        this.sending.set(false);

        this.toasts.success(
          response?.message || 'Documento enviado por correo correctamente.',
        );

        this.sent.emit(row.id);
        this.closed.emit();
      },
      error: (err) => {
        this.sending.set(false);

        if (err?.status === 401) {
          this.toasts.error('La sesión expiró. Inicie sesión nuevamente.');
          return;
        }

        if (err?.status === 403) {
          this.toasts.error(
            'No tiene permisos para despachar documentos por correo.',
          );
          return;
        }

        if (err?.status === 422) {
          this.toasts.error('Revise los datos del correo antes de enviar.');
          return;
        }

        this.toasts.error(
          err?.error?.message ||
          'No se pudo enviar el documento por correo electrónico.',
        );
      },
    });
  }

  toggleAttachment(attachment: DispatchAttachment): void {
    if (attachment.required || attachment.isMainDocument) return;

    const current = this.selectedAttachmentIds();
    const exists = current.includes(attachment.id);

    this.selectedAttachmentIds.set(
      exists
        ? current.filter((id) => id !== attachment.id)
        : [...current, attachment.id],
    );
  }

  isAttachmentSelected(attachment: DispatchAttachment): boolean {
    return this.selectedAttachmentIds().includes(attachment.id);
  }

  selectedAttachments(): DispatchAttachment[] {
    const detail = this.detail();
    if (!detail) return [];

    const selected = this.selectedAttachmentIds();

    return detail.attachments.filter((item) => selected.includes(item.id));
  }

  totalSelectedFiles(): number {
    return this.selectedAttachments().length;
  }

  totalSelectedSize(): string {
    const total = this.selectedAttachments().reduce(
      (sum, item) => sum + Number(item.sizeBytes || 0),
      0,
    );

    return humanSize(total);
  }

  attachmentSizeText(attachment: DispatchAttachment): string {
    return humanSize(attachment.sizeBytes);
  }

  fieldErr(name: string): string | null {
    const control = this.dispatchForm.get(name);

    if (!control || !control.touched || !control.errors) return null;

    if (control.errors['required']) return 'Obligatorio.';
    if (control.errors['emails'])
      return 'Ingrese correos válidos separados por coma.';

    return 'Valor inválido.';
  }

  displayState(state: string | null | undefined): string {
    const normalized = String(state || '').trim();

    if (!normalized) return '—';

    return normalized.toLowerCase();
  }

  mainDocument(): DispatchAttachment | null {
    return (
      this.detail()?.attachments.find((item) => item.isMainDocument) ||
      this.detail()?.attachments.find((item) => item.required) ||
      null
    );
  }

  optionalAttachments(): DispatchAttachment[] {
    return (
      this.detail()?.attachments.filter(
        (item) => !item.isMainDocument && !item.required,
      ) || []
    );
  }

  togglePreview(): void {
    this.dispatchForm.markAllAsTouched();

    if (this.dispatchForm.invalid) {
      this.toasts.error('Complete los datos del correo para ver la vista previa.');
      return;
    }

    this.previewOpen.set(!this.previewOpen());
  }
}
