import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import {
  AccessControlService,
  DocumentRow,
  AccessControlResponsePaged
} from '../../../../core/services/access-control.service';

import { CategoriaService } from '../../../../core/services/categoria.service';

type UiCategory = { id?: number; nombre: string };

@Component({
  selector: 'app-access-control',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './access-control.component.html',
  styleUrls: ['./access-control.component.css'],
})
export class AccessControlComponent implements OnInit {
  user: any = null;

  items: DocumentRow[] = [];
  loading = true;
  error: string | null = null;

  // paginación
  page = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 1;

  accessibleCount = 0;

  categorias: UiCategory[] = [];

  // Estados EXACTOS de la BD (ENUM)
  states = [
    { value: 'CREACION', label: 'Creación' },
    { value: 'EDICION', label: 'Edición' },
    { value: 'FIRMA', label: 'Firma' },
    { value: 'FIRMA_PARCIAL', label: 'Firma parcial' },
    { value: 'ARCHIVADO', label: 'Archivado' },
    { value: 'ELIMINACION', label: 'Eliminación' },
    { value: 'TRANSFERENCIA', label: 'Transferencia' },
  ];

  // filtros (estándar)
  filters = {
    category: 'Todas',
    status: 'Todos',
    dateFrom: '',
    dateTo: '',
    search: ''
  };

  constructor(
    private accessService: AccessControlService,
    private categoriaService: CategoriaService
  ) {}

  ngOnInit() {
    this.loadCategorias();
    this.fetch();
  }

  private loadCategorias() {
    this.categoriaService.getCategorias().subscribe({
      next: (cats: any[]) => {
        this.categorias = (cats || []).map((c: any) => ({
          id: c.id ?? c.id_categoria ?? c.categoria_id ?? c.Id ?? undefined,
          nombre: c.nombre ?? c.name ?? String(c)
        }));
      },
      error: () => (this.categorias = [])
    });
  }

  private buildQuery() {
    const q: any = { page: this.page, pageSize: this.pageSize };

    if (this.filters.category !== 'Todas') q.categoryId = Number(this.filters.category);
    if (this.filters.status !== 'Todos') q.status = String(this.filters.status); // ✅ ENUM real

    if (this.filters.dateFrom) q.dateFrom = this.filters.dateFrom;
    if (this.filters.dateTo) q.dateTo = this.filters.dateTo;

    if (this.filters.search.trim()) q.search = this.filters.search.trim();

    return q;
  }

  fetch() {
    this.loading = true;
    this.error = null;

    this.accessService.getAccessControl(this.buildQuery()).subscribe({
      next: (res: AccessControlResponsePaged) => {
        this.user = res.user;

        this.items = res.items || [];
        this.page = res.page ?? this.page;
        this.pageSize = res.pageSize ?? this.pageSize;
        this.totalItems = res.totalItems ?? 0;
        this.totalPages = res.totalPages ?? 1;

        this.accessibleCount = res.accessibleCount ?? 0;

        this.loading = false;
      },
      error: (err) => {
        console.error('✘ Error:', err);
        this.error = err?.error?.message || 'Error cargando permisos de acceso';
        this.items = [];
        this.totalItems = 0;
        this.totalPages = 1;
        this.loading = false;
      }
    });
  }

  applyFilters() {
    this.page = 1;
    this.fetch();
  }

  clearFilters() {
    this.filters = {
      category: 'Todas',
      status: 'Todos',
      dateFrom: '',
      dateTo: '',
      search: ''
    };
    this.page = 1;
    this.fetch();
  }

  goPrev() {
    if (this.page > 1) {
      this.page--;
      this.fetch();
    }
  }

  goNext() {
    if (this.page < this.totalPages) {
      this.page++;
      this.fetch();
    }
  }

  get rangeEnd(): number {
    return Math.min(this.page * this.pageSize, this.totalItems);
  }

  getIconPath(allowed: boolean): string {
    return allowed ? 'assets/icons/check.png' : 'assets/icons/equis.png';
  }
}
