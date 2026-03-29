import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ConsultaDashboardApiService } from '../../../core/services/consulta-dashboard-api.service';
import { ConsultaDocumentoRow } from '../../../core/services/consulta-aprobados-api.service';

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

  loading = true;
  errorMsg = '';
  semana: { desde: string; hasta: string } | null = null;
  novedades: ConsultaDocumentoRow[] = [];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.api.getResumen().subscribe({
      next: (r) => {
        this.semana = r.semana;
        this.novedades = r.novedades ?? [];
        this.loading = false;
      },
      error: (e) => {
        this.errorMsg = e?.error?.message || 'Error al cargar novedades.';
        this.loading = false;
      },
    });
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
