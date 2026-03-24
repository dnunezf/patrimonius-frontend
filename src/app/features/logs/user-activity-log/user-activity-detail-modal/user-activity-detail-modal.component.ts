import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PermissionBitacoraDetail } from '../../../../../core/services/audit.service';

@Component({
  selector: 'app-user-activity-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-activity-detail-modal.component.html',
  styleUrls: ['./user-activity-detail-modal.component.css'],
})
export class UserActivityDetailModalComponent {
  @Input() open = false;
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() detail: PermissionBitacoraDetail | null = null;

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
