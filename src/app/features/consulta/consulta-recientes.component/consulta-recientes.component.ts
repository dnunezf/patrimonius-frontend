import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  ConsultaDashboardApiService,
  ConsultaDashboardResumen,
} from '../../../../core/services/consulta-dashboard-api.service';
import { ConsultaPanelPrefsService } from '../../../../core/services/consulta-panel-prefs.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-consulta-recientes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './consulta-recientes.component.html',
  styleUrls: ['./consulta-recientes.component.css'],
})
export class ConsultaRecientesComponent implements OnInit {
  private readonly api = inject(ConsultaDashboardApiService);
  private readonly router = inject(Router);
  private readonly prefs = inject(ConsultaPanelPrefsService);
  private readonly auth = inject(AuthService);

  readonly topRecientes = 15;

  usuarioId = 0;
  loading = true;
  errorMsg = '';
  recientes: {
    documento_id: number;
    fecha: string;
    codigo: string;
    titulo: string;
    estado: string;
  }[] = [];

  ngOnInit(): void {
    const u = this.auth.currentUser?.();
    this.usuarioId = u?.id ?? 0;
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.errorMsg = '';
    const desde =
      this.usuarioId > 0 ? this.prefs.getRecientesDesde(this.usuarioId) : null;
    this.api
      .getResumen({
        recientesDesde: desde || undefined,
      })
      .subscribe({
        next: (r: ConsultaDashboardResumen) => {
          this.recientes = r.recientes ?? [];
          this.loading = false;
        },
        error: (e: unknown) => {
          const err = e as { error?: { message?: string } };
          this.errorMsg =
            err?.error?.message || 'Error al cargar documentos recientes.';
          this.loading = false;
        },
      });
  }

  limpiar(): void {
    if (!this.usuarioId) return;
    this.prefs.clearRecientes(this.usuarioId);
    this.cargar();
  }

  restaurar(): void {
    if (!this.usuarioId) return;
    this.prefs.resetRecientes(this.usuarioId);
    this.cargar();
  }

  formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('es-CR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  volver(): void {
    this.router.navigate(['/usuario/dashboard']);
  }
}
