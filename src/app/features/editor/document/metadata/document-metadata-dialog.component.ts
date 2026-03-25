import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  OnChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  DocumentService,
  DocumentMetadata,
  MetadataAccessLevel,
} from '../../../../../core/services/document.service';

function toCsv(arr: string[] | null | undefined) {
  return Array.isArray(arr) ? arr.join(', ') : '';
}

function humanSize(bytes: number | null): string {
  if (bytes == null || bytes < 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 10 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`;
}

@Component({
  selector: 'app-document-metadata-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './document-metadata-dialog.component.html',
  styleUrls: ['./document-metadata-dialog.component.css'],
})
export class DocumentMetadataDialogComponent implements OnInit, OnChanges {
  @Input() documentId!: number;
  @Input() open = false;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  loading = false;
  saving = false;
  error: string | null = null;

  meta: DocumentMetadata | null = null;
  form!: FormGroup;

  readonly accessOptions: Array<{
    value: MetadataAccessLevel;
    label: string;
  }> = [
    { value: 'PUBLIC', label: 'Público' },
    { value: 'INTERNAL', label: 'Interno' },
    { value: 'HIGH', label: 'Alto' },
    { value: 'RESTRICTED', label: 'Restringido' },
  ];

  constructor(
    private fb: FormBuilder,
    private docs: DocumentService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      documentType: ['', [Validators.required, Validators.maxLength(150)]],
      title: ['', [Validators.required, Validators.maxLength(255)]],
      keywords: ['', [Validators.maxLength(2000)]],
      accessLevel: ['INTERNAL', [Validators.required]],
    });

    if (this.open) this.load();
  }

  ngOnChanges(): void {
    if (this.open) this.load();
  }

  load(): void {
    if (!this.documentId) return;

    this.loading = true;
    this.error = null;

    this.docs.getMetadata(this.documentId).subscribe({
      next: (m) => {
        this.meta = m;
        this.form.reset({
          documentType: m.manual.documentType || '',
          title: m.manual.title || '',
          keywords: toCsv(m.manual.keywords),
          accessLevel: m.manual.accessLevel || 'INTERNAL',
        });
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.message || 'No se pudieron cargar los metadatos';
        this.loading = false;
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.error = null;

    const v = this.form.value;

    const payload = {
      documentType: String(v.documentType || '')
        .replace(/\s+/g, ' ')
        .trim(),
      title: String(v.title || '')
        .replace(/\s+/g, ' ')
        .trim(),
      keywords: String(v.keywords || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
        .slice(0, 20),
      accessLevel: v.accessLevel as MetadataAccessLevel,
    };

    this.docs.saveDescriptiveMetadata(this.documentId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
        this.close();
      },
      error: (e) => {
        const msg =
          e?.status === 422
            ? 'Revise los campos obligatorios.'
            : e?.error?.message || 'No se pudieron guardar los metadatos';
        this.error = msg;
        this.saving = false;
      },
    });
  }

  close(): void {
    this.open = false;
    this.closed.emit();
  }

  get f() {
    return this.form.controls;
  }

  sizeHuman(): string {
    return humanSize(this.meta?.automatic?.sizeBytes ?? null);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return 'Pendiente';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Pendiente';
    return new Intl.DateTimeFormat('es-CR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  }

  approvalText(value: string | null | undefined): string {
    return value || 'Pendiente de aprobación';
  }
}
