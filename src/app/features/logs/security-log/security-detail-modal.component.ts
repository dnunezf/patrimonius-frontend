import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SecurityDetail } from '../../../../core/services/audit.service';

@Component({
  selector: 'app-security-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './security-detail-modal.component.html',
  styleUrls: ['./security-detail-modal.component.css'],
})
export class SecurityDetailModalComponent {
  @Input() open = false;
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() detail: SecurityDetail | null = null;

  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }

  fullName(detail: SecurityDetail): string {
    if (detail.usuario_nombre_completo?.trim()) return detail.usuario_nombre_completo.trim();
    return [detail.usuario_nombre, detail.usuario_apellido1, detail.usuario_apellido2]
      .filter((p) => !!p && String(p).trim().length > 0)
      .join(' ')
      .trim() || '—';
  }

  formatJson(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
}
