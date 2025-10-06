// src/app/core/features/editor/document/document-metadata-dialog.component.ts
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
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import {
  DocumentService,
  DocumentMetadata,
} from 'core/services/document.service';

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

/** Custom validator: at least one keyword after splitting CSV. */
function requireKeywords(ctrl: AbstractControl): ValidationErrors | null {
  const raw = String(ctrl.value || '').trim();
  if (!raw) return { required: true };
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? null : { required: true };
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

  constructor(private fb: FormBuilder, private docs: DocumentService) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(255)]],
      author: ['', [Validators.required, Validators.maxLength(120)]],
      responsibleUnitId: [null, [Validators.required, Validators.min(1)]],
      keywords: ['', [requireKeywords, Validators.maxLength(2000)]], // REQUIRED (>=1)
      preliminaryClass: ['', [Validators.required, Validators.maxLength(150)]],
      classificationCode: ['', [Validators.required, Validators.maxLength(60)]],
      retentionYears: [
        null,
        [Validators.required, Validators.min(1), Validators.max(200)],
      ],
      pages: [null, [Validators.min(1), Validators.max(10000)]],
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
          title: m.descriptive.title || '',
          author: m.descriptive.author || '',
          responsibleUnitId: m.descriptive.responsibleUnitId || null,
          keywords: toCsv(m.descriptive.keywords),
          preliminaryClass: m.descriptive.preliminaryClass || '',
          classificationCode: m.descriptive.classificationCode || '',
          retentionYears: m.descriptive.retentionYears ?? null,
          pages: m.descriptive.pages ?? null,
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
    const title = String(v.title || '')
      .replace(/\s+/g, ' ')
      .trim();
    const author = String(v.author || '')
      .replace(/\s+/g, ' ')
      .trim();
    const preliminaryClass = String(v.preliminaryClass || '')
      .replace(/\s+/g, ' ')
      .trim();
    const classificationCode = String(v.classificationCode || '')
      .replace(/\s+/g, ' ')
      .trim();
    const keywords = String(v.keywords || '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)
      .slice(0, 20);

    this.docs
      .saveDescriptiveMetadata(this.documentId, {
        title,
        author,
        responsibleUnitId: Number(v.responsibleUnitId),
        keywords,
        preliminaryClass,
        classificationCode,
        retentionYears: Number(v.retentionYears),
        pages: v.pages != null && v.pages !== '' ? Number(v.pages) : undefined,
      })
      .subscribe({
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

  // Expose for template
  get f() {
    return this.form.controls;
  }
  sizeHuman(): string {
    return humanSize(this.meta?.technical?.sizeBytes ?? null);
  }

  /** Localized, human-readable date for ES */
  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('es', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  }
}
