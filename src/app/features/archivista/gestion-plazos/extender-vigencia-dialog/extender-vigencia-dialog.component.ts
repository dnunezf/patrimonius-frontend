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

@Component({
  selector: 'app-extender-vigencia-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './extender-vigencia-dialog.component.html',
  styleUrls: ['./extender-vigencia-dialog.component.css'],
})
export class ExtenderVigenciaDialogComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() expediente: ExpedientePlazoRow | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() extensionGuardada = new EventEmitter<void>();

  aniosExt = '';
  justificacion = '';
  guardando = false;
  errorApi = '';

  documentosCount: number | null = null;
  documentosLoading = false;
  documentosLoadFailed = false;

  private documentosSub?: Subscription;
  private guardarSub?: Subscription;

  constructor(
    private readonly gestionPlazos: GestionPlazosConservacionService
  ) {}

  ngOnChanges(_changes: SimpleChanges): void {
    if (!this.open) {
      this.resetLocal();
      return;
    }
    if (this.expediente?.id) {
      this.aniosExt = '';
      this.justificacion = '';
      this.errorApi = '';
      this.cargarConteoDocumentos();
    }
  }

  ngOnDestroy(): void {
    this.documentosSub?.unsubscribe();
    this.guardarSub?.unsubscribe();
  }

  cerrar(): void {
    if (this.guardando) {
      return;
    }
    this.closed.emit();
  }

  vencimientoActualFormateado(): string {
    const raw = this.expediente?.fecha_vencimiento;
    if (!raw) {
      return '—';
    }
    try {
      return new Intl.DateTimeFormat('es', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(raw));
    } catch {
      return '—';
    }
  }

  tituloExpediente(): string {
    const ex = this.expediente;
    if (!ex) {
      return '—';
    }
    const n = ex.nombre?.trim();
    return n || '—';
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

  get puedeGuardar(): boolean {
    if (!this.expediente?.id || !this.expediente.fecha_vencimiento) {
      return false;
    }
    const j = this.justificacion.trim();
    if (!j) {
      return false;
    }
    const n = Number.parseInt(String(this.aniosExt).trim(), 10);
    return Number.isInteger(n) && n >= 1 && n <= 10;
  }

  guardar(): void {
    const id = this.expediente?.id;
    if (!id || !this.puedeGuardar || this.guardando) {
      return;
    }
    const anios = Number.parseInt(String(this.aniosExt).trim(), 10);
    const justificacion = this.justificacion.trim();

    this.guardando = true;
    this.errorApi = '';
    this.guardarSub?.unsubscribe();
    this.guardarSub = this.gestionPlazos
      .extenderVigenciaExpediente(id, { anios, justificacion })
      .subscribe({
        next: () => {
          this.guardando = false;
          this.extensionGuardada.emit();
          this.closed.emit();
        },
        error: (err) => {
          this.guardando = false;
          this.errorApi =
            err?.error?.error ||
            err?.error?.message ||
            'No se pudo guardar la extensión.';
        },
      });
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
    this.guardarSub?.unsubscribe();
    this.documentosSub = undefined;
    this.guardarSub = undefined;
    this.documentosCount = null;
    this.documentosLoading = false;
    this.documentosLoadFailed = false;
    this.aniosExt = '';
    this.justificacion = '';
    this.guardando = false;
    this.errorApi = '';
  }
}
