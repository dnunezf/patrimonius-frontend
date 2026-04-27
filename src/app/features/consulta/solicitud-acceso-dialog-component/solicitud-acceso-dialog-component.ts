import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  ConsultaAprobadosApiService,
  ConsultaDocumentoRow,
} from '../../../../core/services/consulta-aprobados-api.service';

@Component({
  selector: 'app-solicitud-acceso-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './solicitud-acceso-dialog-component.html',
  styleUrls: ['./solicitud-acceso-dialog-component.css'],
})
export class SolicitudAccesoDialogComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ConsultaAprobadosApiService);

  @Input() open = false;
  @Input() documento: ConsultaDocumentoRow | null = null;

  // opcional: si luego quieres mostrar el id del usuario autenticado
  @Input() usuarioSolicitanteId: number | null = null;
  @Input() usuarioNombre = 'Usuario autenticado';

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  saving = false;
  error = '';
  success = '';

  readonly form = this.fb.group({
    justificacion: ['', [Validators.required, Validators.maxLength(1000)]],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.error = '';
      this.success = '';
      this.form.reset({
        justificacion: '',
      });
    }
  }

  submit(): void {
    if (!this.documento) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const justificacion = String(this.form.value.justificacion || '')
      .replace(/\s+/g, ' ')
      .trim();

    this.saving = true;
    this.error = '';
    this.success = '';

    this.api.createSolicitudAcceso(this.documento.id, { justificacion }).subscribe({
      next: () => {
        this.saving = false;
        this.success = 'Solicitud enviada correctamente.';
        this.created.emit();
        setTimeout(() => this.close(), 500);
      },
      error: (e: unknown) => {
        this.saving = false;
        const err = e as { error?: { message?: string } };
        this.error =
          err?.error?.message || 'No se pudo registrar la solicitud.';
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

  formatDate(value: string | null | undefined): string {
    if (!value) return 'Pendiente';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Pendiente';
    return new Intl.DateTimeFormat('es-CR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  }
}
