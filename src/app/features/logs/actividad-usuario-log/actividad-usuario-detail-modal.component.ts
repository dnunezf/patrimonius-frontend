import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserActivityBitacoraDetail } from '../../../../core/services/audit.service';

@Component({
  selector: 'app-actividad-usuario-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './actividad-usuario-detail-modal.component.html',
  styleUrls: ['./actividad-usuario-detail-modal.component.css'],
})
export class ActividadUsuarioDetailModalComponent {
  @Input() open = false;
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() detail: UserActivityBitacoraDetail | null = null;

  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }

  formatJson(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'string') {
      const s = value.trim();
      if (!s) return '—';
      try {
        const parsed = JSON.parse(s);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return s;
      }
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
}
