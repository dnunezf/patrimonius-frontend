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
import { ConsultaAprobadosApiService } from '../../../core/services/consulta-aprobados-api.service';

export type ConsultaExpedienteRow = {
  id: number;
  codigo: string;
  nombre: string;
  estado?: string | null;
  serie_nombre?: string | null;
  subserie_nombre?: string | null;
  total_documentos_elegibles?: number | null;
};

@Component({
  selector: 'app-solicitud-acceso-expediente-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './solicitud-acceso-expediente-dialog-component.html',
  styleUrls: ['./solicitud-acceso-expediente-dialog-component.css'],
})
export class SolicitudAccesoExpedienteDialogComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ConsultaAprobadosApiService);

  @Input() open = false;
  @Input() expediente: ConsultaExpedienteRow | null = null;

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
    if (!this.expediente) return;

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

    this.api
      .createSolicitudAccesoExpediente(this.expediente.id, { justificacion })
      .subscribe({
        next: () => {
          this.saving = false;
          this.success = 'Solicitud de acceso al expediente enviada correctamente.';
          this.created.emit();
          setTimeout(() => this.close(), 500);
        },
        error: (e) => {
          this.saving = false;
          this.error =
            e?.error?.message ||
            'No se pudo registrar la solicitud de acceso al expediente.';
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
}
