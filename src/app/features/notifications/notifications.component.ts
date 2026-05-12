import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';

import { Notificacion } from '../../shared/models/notificacion.model';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { NotificationsStore } from '../../shared/state/notifications.store';

@Component({
  selector: 'app-system-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css'],
})
export class NotificationsComponent implements OnInit {
  loading = false;
  error = '';
  items: Notificacion[] = [];
  unread = 0;

  constructor(
    private notiSvc: NotificacionService,
    private notiStore: NotificationsStore,
    private location: Location,
  ) {}

  /** Vuelve a la pantalla anterior (mismo patrón que consulta: Regresar). */
  regresar(): void {
    this.location.back();
  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh() {
    this.loading = true;
    this.error = '';

    this.notiSvc.unreadCount().subscribe({
      next: (r) => {
        this.unread = r.unread ?? 0;
        this.notiStore.setCount(this.unread);
      },
      error: () => {
        this.unread = 0;
        this.notiStore.setCount(0);
      },
    });

    this.notiSvc.listMine({ unreadOnly: true, limit: 50, offset: 0 }).subscribe({
      next: (r) => {
        this.items = r.items ?? [];
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar las notificaciones.';
        this.loading = false;
      },
    });
  }

  isUnread(n: Notificacion) {
    return Number(n.leida) === 0;
  }

  formatDate(raw: string): string {
    if (!raw) return '';
    return new Date(raw).toLocaleString('es-CR');
  }

  /** Recordatorio semanal archivista / expedientes ACTIVO. */
  isRevisionExpedientesActivos(tipo?: string | null): boolean {
    return !!tipo && tipo.startsWith('ARCHIVISTA_EXP_ACTIVOS_');
  }

  isExpedienteConservacionVencido(tipo?: string | null): boolean {
    return tipo === 'EXPEDIENTE_CONSERVACION_VENCIDO';
  }

  isExpedienteConservacionProximo(tipo?: string | null): boolean {
    return tipo === 'EXPEDIENTE_CONSERVACION_PROXIMO';
  }

  // Actualización del título según el tipo de notificación
  titleFor(tipo?: string) {
    if (this.isRevisionExpedientesActivos(tipo)) {
      return 'Revisión de expedientes activos';
    }
    if (this.isExpedienteConservacionVencido(tipo)) {
      return 'Plazo de conservación vencido';
    }
    if (this.isExpedienteConservacionProximo(tipo)) {
      return 'Plazo próximo a vencer (expediente)';
    }
    switch (tipo) {
      case 'PLAZO_ASIGNADO': return 'Plazo asignado';
      case 'DOC_EDITADO': return 'Documento editado';
      case 'DOC_FIRMA_SOLICITADA': return 'Firma requerida';
      case 'DOC_ARCHIVADO': return 'Documento archivado';
      case 'DOC_ELIMINACION': return 'Documento en eliminación';
      case 'DOC_FIRMA_INVALIDA': return 'Firma digital inválida';
      default: return 'Notificación';
    }
  }

  getCreadoEn(resultado?: string | null): string {
    const v = (resultado ?? '').replace('Creado en:', '').trim();
    return v || 'No disponible';
  }

  cleanEditor(resultado?: string | null) {
    if (!resultado) return 'No disponible';
    return String(resultado).replace(/^Editado por:\s*/i, '').trim();
  }

  iconFor(n: Notificacion): 'warn' | 'info' | 'ok' {
    if (n.tipo === 'EXPEDIENTE_CONSERVACION_VENCIDO') return 'warn';
    if (n.tipo === 'EXPEDIENTE_CONSERVACION_PROXIMO') return 'warn';
    if (n.tipo === 'DOC_FIRMA_INVALIDA') return 'warn';
    if (n.tipo?.includes('DENEG') || n.tipo?.includes('ACCESO')) return 'warn';
    if (n.accion_requerida === 'FIRMAR') return 'info';
    if (n.accion_requerida === 'ARCHIVAR') return 'ok';
    if (n.accion_requerida === 'ELIMINAR') return 'warn';
    return 'info';
  }

  /** Emoji visible en el cuadro izquierdo de cada tarjeta (vista «Ver todas»). */
  emojiFor(n: Notificacion): string {
    const t = n.tipo ?? '';
    switch (t) {
      case 'PLAZO_ASIGNADO':
        return '⏱️';
      case 'DOC_EDITADO':
        return '✏️';
      case 'DOC_FIRMA_SOLICITADA':
        return '✍️';
      case 'DOC_ARCHIVADO':
        return '📦';
      case 'DOC_ELIMINACION':
        return '🗑️';
      case 'DOC_FIRMA_INVALIDA':
        return '⚠️';
      case 'EXPEDIENTE_CONSERVACION_VENCIDO':
        return '⚠️';
      case 'EXPEDIENTE_CONSERVACION_PROXIMO':
        return '⏳';
      default:
        if (t.startsWith('ARCHIVISTA_EXP_ACTIVOS_')) return '📁';
        if (t.includes('DENEG') || t.includes('ACCESO')) return '🔒';
        return '🔔';
    }
  }

  markAsRead(n: Notificacion) {
    if (!this.isUnread(n)) return;

    this.notiSvc.markRead(n.id).subscribe({
      next: () => {
        this.items = this.items.filter(x => x.id !== n.id);
        this.unread = Math.max(0, this.unread - 1);
        this.notiStore.setCount(this.unread);
      },
      error: () => this.error = 'No se pudo marcar como leída.'
    });
  }
}
