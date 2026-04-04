import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  ConsultaAprobadosApiService,
  ConsultaDocumentoRow,
  ConsultaFiltrosOpciones,
} from '../../../core/services/consulta-aprobados-api.service';
import { ConsultaDashboardApiService } from '../../../core/services/consulta-dashboard-api.service';
import { ConsultaFavoritosService } from '../../../core/services/consulta-favoritos.service';
import { ConfirmService } from '../../shared/ui/confirm.service';

@Component({
  selector: 'app-consulta-favoritos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consulta-favoritos.component.html',
  styleUrls: ['./consulta-favoritos.component.css'],
})
export class ConsultaFavoritosComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ConsultaAprobadosApiService);
  private readonly dash = inject(ConsultaDashboardApiService);
  private readonly fav = inject(ConsultaFavoritosService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  usuarioId = 0;
  filtros: ConsultaFiltrosOpciones | null = null;

  q = '';
  categoriaId = '';
  searchRows: ConsultaDocumentoRow[] = [];
  searchLoading = false;
  searchError = '';

  favRows: ConsultaDocumentoRow[] = [];
  loadingFav = false;
  filtroFav = '';
  favPage = 1;
  favPageSize = 10;

  ngOnInit(): void {
    const u = this.auth.currentUser?.();
    this.usuarioId = u?.id ?? 0;

    this.api.getFilterOptions(false).subscribe({
      next: (f) => (this.filtros = f),
      error: () => {
        /* categorías opcionales */
      },
    });
    this.loadFavorites();
  }

  buscarParaFavoritos(): void {
    this.searchError = '';
    this.searchLoading = true;
    this.api
      .searchInterno({
        q: this.q.trim() || undefined,
        categoriaId: this.categoriaId || undefined,
        page: 1,
        pageSize: 30,
        sortBy: 'fecha_aprobacion',
        sortDir: 'desc',
      })
      .subscribe({
        next: (r) => {
          this.searchRows = r.items ?? [];
          this.searchLoading = false;
        },
        error: (e) => {
          this.searchError =
            e?.error?.message || 'No se pudo buscar. Intente de nuevo.';
          this.searchLoading = false;
        },
      });
  }

  loadFavorites(): void {
    if (!this.usuarioId) {
      this.favRows = [];
      return;
    }
    const ids = this.fav.getIds(this.usuarioId);
    if (!ids.length) {
      this.favRows = [];
      return;
    }
    this.loadingFav = true;
    this.dash.documentosPorIds(ids).subscribe({
      next: (r) => {
        this.favRows = r.items ?? [];
        this.loadingFav = false;
      },
      error: () => {
        this.favRows = [];
        this.loadingFav = false;
      },
    });
  }

  isStarred(id: number): boolean {
    return this.usuarioId > 0 && this.fav.has(this.usuarioId, id);
  }

  toggleStar(row: ConsultaDocumentoRow): void {
    if (!this.usuarioId) return;
    this.fav.toggle(this.usuarioId, row.id);
    this.loadFavorites();
  }

  get favoritosFiltrados(): ConsultaDocumentoRow[] {
    const t = this.filtroFav.trim().toLowerCase();
    if (!t) return this.favRows;
    return this.favRows.filter((r) =>
      [r.codigo, r.titulo, r.categoria_nombre, r.unidad_nombre]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(t),
    );
  }

  get favoritosPagina(): ConsultaDocumentoRow[] {
    const all = this.favoritosFiltrados;
    const start = (this.favPage - 1) * this.favPageSize;
    return all.slice(start, start + this.favPageSize);
  }

  get favTotalPages(): number {
    return Math.max(1, Math.ceil(this.favoritosFiltrados.length / this.favPageSize));
  }

  async limpiarFavoritos(): Promise<void> {
    if (!this.usuarioId) return;
    const ok = await this.confirm.ask(
      '¿Quitar todos los favoritos guardados en este navegador? Esta acción no se puede deshacer.',
      'Quitar favoritos',
      { confirmLabel: 'Aceptar', cancelLabel: 'Cancelar' },
    );
    if (!ok) return;
    this.fav.clearAll(this.usuarioId);
    this.favPage = 1;
    this.loadFavorites();
  }

  prevFavPage(): void {
    if (this.favPage > 1) this.favPage--;
  }

  nextFavPage(): void {
    if (this.favPage < this.favTotalPages) this.favPage++;
  }

  formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('es-CR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  volver(): void {
    this.router.navigate(['/usuario/dashboard']);
  }
}
