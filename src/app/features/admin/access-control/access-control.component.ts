// src/app/features/admin/access-control/access-control.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
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
    private categoriaService: CategoriaService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadCategorias();
    this.restoreFromUrl();
    this.fetch();
  }

  private restoreFromUrl() {
    const qp = this.route.snapshot.queryParamMap;

    const page = Number(qp.get('page') || 1);
    const pageSize = Number(qp.get('pageSize') || 10);
    this.page = Number.isFinite(page) && page > 0 ? page : 1;
    this.pageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;

    const categoryId = qp.get('categoryId');
    const status = qp.get('status');
    const dateFrom = qp.get('dateFrom');
    const dateTo = qp.get('dateTo');
    const search = qp.get('search');

    this.filters.category = categoryId ? String(categoryId) : 'Todas';
    this.filters.status = status ? String(status) : 'Todos';
    this.filters.dateFrom = dateFrom ? String(dateFrom) : '';
    this.filters.dateTo = dateTo ? String(dateTo) : '';
    this.filters.search = search ? String(search) : '';
  }

  private syncUrl() {
    const q = this.buildQuery();

    // No ensuciamos URL con vacíos
    const qp: any = {};
    Object.keys(q).forEach((k) => {
      const v = (q as any)[k];
      if (v !== null && v !== undefined && v !== '') qp[k] = v;
    });

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: qp,
      replaceUrl: true,
    });
  }

  // =========================
  // Data
  // =========================
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
    if (this.filters.status !== 'Todos') q.status = String(this.filters.status);

    if (this.filters.dateFrom) q.dateFrom = this.filters.dateFrom;
    if (this.filters.dateTo) q.dateTo = this.filters.dateTo;

    if (this.filters.search.trim()) q.search = this.filters.search.trim();

    return q;
  }

  fetch() {
    this.loading = true;
    this.error = null;

    this.syncUrl();

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

  // =========================
  // Helpers UI
  // =========================
  private toBool(value: any): boolean {
    if (value === true) return true;
    if (value === false) return false;

    if (value === 1) return true;
    if (value === 0) return false;

    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      if (v === 'true' || v === '1' || v === 'yes' || v === 'y') return true;
      if (v === 'false' || v === '0' || v === 'no' || v === 'n' || v === '') return false;
    }

    if (value == null) return false;

    return !!value;
  }

  getIconPath(allowed: any): string {
    const ok = this.toBool(allowed);
    return ok ? '/assets/icons/check.png' : '/assets/icons/equis.png';
  }

  // =========================
  // ✅ Navegar directo al documento (UX museo)
  // =========================
  canOpen(doc: DocumentRow): boolean {
    // ✅ IMPORTANTE: para abrir, usamos SOLO lo que es posible ahora (canX)
    // (hasSign es informativo, pero NO debe permitir abrir)
    return this.toBool(doc.canView) || this.toBool(doc.canEdit) || this.toBool(doc.canSign);
  }

  getOpenHint(doc: DocumentRow): string {
    if (!this.canOpen(doc)) return 'Sin acceso a este documento';
    if (this.toBool(doc.canEdit)) return 'Abrir en edición';
    return 'Abrir en vista';
  }

  openDoc(doc: DocumentRow): void {
    if (!this.canOpen(doc)) return;

    // ✅ RUTA CONOCIDA EN TU APP: /editor/document/:id/edit
    // - Si NO puede editar, lo abrimos igual pero en modo lectura por query param readonly=1
    const readonly = this.toBool(doc.canEdit) ? 0 : 1;

    this.router.navigate(
      ['/editor/document', doc.id, 'edit'],
      {
        queryParams: {
          readonly,
          // guardamos “de dónde vino” para retorno (opcional)
          returnTo: this.router.url
        }
      }
    );
  }

  onRowKeydown(ev: KeyboardEvent, doc: DocumentRow) {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.openDoc(doc);
    }
  }
}
