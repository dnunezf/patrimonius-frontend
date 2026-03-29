import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ConsultaDashboardApiService } from '../../../core/services/consulta-dashboard-api.service';

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
    this.api.getResumen().subscribe({
      next: (r) => {
        this.recientes = r.recientes ?? [];
        this.loading = false;
      },
      error: (e) => {
        this.errorMsg = e?.error?.message || 'Error al cargar documentos recientes.';
        this.loading = false;
      },
    });
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
