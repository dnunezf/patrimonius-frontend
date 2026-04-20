import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpedienteBitacoraDetail } from '../../../../../core/services/audit.service';

@Component({
  selector: 'app-expediente-bitacora-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './expediente-bitacora-detail-modal.component.html',
  styleUrls: ['./expediente-bitacora-detail-modal.component.css'],
})
export class ExpedienteBitacoraDetailModalComponent {
  @Input() open = false;
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() detail: ExpedienteBitacoraDetail | null = null;

  @Output() closed = new EventEmitter<void>();

  formatDetalleJson(d: unknown): string {
    if (d === null || d === undefined) return '—';
    if (typeof d === 'string') return d;
    try {
      return JSON.stringify(d, null, 2);
    } catch {
      return String(d);
    }
  }

  close(): void {
    this.closed.emit();
  }
}
