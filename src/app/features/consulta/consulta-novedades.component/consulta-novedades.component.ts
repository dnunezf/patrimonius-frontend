import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  ConsultaDashboardApiService,
  ConsultaDashboardResumen,
} from '../../../../core/services/consulta-dashboard-api.service';
import { ConsultaDocumentoRow } from '../../../../core/services/consulta-aprobados-api.service';
import { ConsultaPanelPrefsService } from '../../../../core/services/consulta-panel-prefs.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-consulta-novedades',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './consulta-novedades.component.html',
  styleUrls: ['./consulta-novedades.component.css'],
})
export class ConsultaNovedadesComponent implements OnInit {
  private readonly api = inject(ConsultaDashboardApiService);
  private readonly router = inject(Router);
  private readonly prefs = inject(ConsultaPanelPrefsService);
  private readonly auth = inject(AuthService);

  usuarioId = 0;
  loading = true;
  errorMsg = '';
  periodo: { desde: string; hasta: string } | null = null;
  novedades: ConsultaDocumentoRow[] = [];
  page = 1;
  pageSize = 15;
  totalItems = 0;
  totalPages = 1;

  ngOnInit(): void {
    const u = this.auth.currentUser?.();
    this.usuarioId = u?.id ?? 0;
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.errorMsg = '';
    const desde =
      this.usuarioId > 0 ? this.prefs.getNovedadesDesde(this.usuarioId) : null;
    this.api
      .getResumen({
        novedadesPage: this.page,
        novedadesPageSize: this.pageSize,
        novedadesDesde: desde || undefined,
      })
      .subscribe({
        next: (r: ConsultaDashboardResumen) => {
          this.periodo = r.periodo ?? r.semana;
          this.novedades = r.novedades ?? [];
          this.totalItems = r.novedadesTotal ?? this.novedades.length;
          this.totalPages = r.novedadesTotalPages ?? 1;
          this.loading = false;
        },
        error: (e: unknown) => {
          const err = e as { error?: { message?: string } };
          this.errorMsg = err?.error?.message || 'Error al cargar novedades.';
          this.loading = false;
        },
      });
  }

  limpiar(): void {
    if (!this.usuarioId) return;
    this.prefs.clearNovedades(this.usuarioId);
    this.page = 1;
    this.cargar();
  }

  restaurar(): void {
    if (!this.usuarioId) return;
    this.prefs.resetNovedades(this.usuarioId);
    this.page = 1;
    this.cargar();
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.cargar();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.cargar();
    }
  }

  formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('es-CR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  volver(): void {
    this.router.navigate(['/usuario/dashboard']);
  }
}
