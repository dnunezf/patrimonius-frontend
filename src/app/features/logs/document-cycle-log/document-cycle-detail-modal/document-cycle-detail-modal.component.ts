import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditDetail } from '../../../../../core/services/audit.service';

@Component({
  selector: 'app-document-cycle-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-cycle-detail-modal.component.html',
  styleUrls: ['./document-cycle-detail-modal.component.css'],
})
export class DocumentCycleDetailModalComponent {
  @Input() open = false;
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() detail: AuditDetail | null = null;

  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }

  fullName(detail: AuditDetail): string {
    if (detail.usuario_nombre_completo?.trim()) return detail.usuario_nombre_completo.trim();
    return [detail.usuario_nombre, detail.usuario_apellido1, detail.usuario_apellido2]
      .filter((p) => !!p && String(p).trim().length > 0)
      .join(' ')
      .trim() || '—';
  }
}
