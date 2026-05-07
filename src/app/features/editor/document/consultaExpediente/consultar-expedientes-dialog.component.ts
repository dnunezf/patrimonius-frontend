import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpedienteService } from '../../../../../core/services/expediente.service';
import { CrearExpedienteDialogComponent } from './crear-expediente-dialog.component';

type ExpedienteRow = {
  id: number;
  codigo: string;
  nombre: string;
  unidad_nombre?: string | null;
  serie_nombre?: string | null;
  subserie_nombre?: string | null;
  estado?: string | null;
};

@Component({
  selector: 'app-consultar-expedientes-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, CrearExpedienteDialogComponent],
  templateUrl: './consultar-expedientes-dialog.component.html',
  styleUrls: ['./consultar-expedientes-dialog.component.css'],
})
export class ConsultarExpedientesDialogComponent implements OnChanges {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  loading = false;
  error: string | null = null;

  expedientes: ExpedienteRow[] = [];
  filteredExpedientes: ExpedienteRow[] = [];
  expedientesPage = 1;
  expedientesPageSize = 5;
  pagedExpedientes: ExpedienteRow[] = [];
  searchExpedientes = '';

  constructor(private expedienteService: ExpedienteService) {}

  ngOnChanges(): void {
    if (this.open) {
      this.load();
    }
  }

  private toUpperValue(value: string | null | undefined): string {
    return String(value || '').toUpperCase();
  }

  onSearchExpedientesInput(): void {
    this.searchExpedientes = this.toUpperValue(this.searchExpedientes);
    this.aplicarFiltroExpedientes();
  }

  load(): void {
    this.loading = true;
    this.error = null;

    this.expedienteService.getExpedientes().subscribe({
      next: (rows: ExpedienteRow[]) => {
        this.expedientes = rows ?? [];
        this.expedientesPage = 1;
        this.aplicarFiltroExpedientes();
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.message || 'No se pudieron cargar los expedientes';
        this.loading = false;
      },
    });
  }

  aplicarFiltroExpedientes(): void {
    const q = this.searchExpedientes.trim().toLowerCase();

    this.filteredExpedientes = this.expedientes.filter((e) => {
      if (!q) return true;

      return (
        String(e.codigo || '').toLowerCase().includes(q) ||
        String(e.nombre || '').toLowerCase().includes(q) ||
        String(e.unidad_nombre || '').toLowerCase().includes(q) ||
        String(e.serie_nombre || '').toLowerCase().includes(q) ||
        String(e.subserie_nombre || '').toLowerCase().includes(q) ||
        String(e.estado || '').toLowerCase().includes(q)
      );
    });

    this.expedientesPage = 1;
    this.updatePagedExpedientes();
  }

  get totalExpedientesPages(): number {
    return Math.max(Math.ceil(this.filteredExpedientes.length / this.expedientesPageSize), 1);
  }

  get expedientesRangeStart(): number {
    if (this.filteredExpedientes.length === 0) return 0;
    return (this.expedientesPage - 1) * this.expedientesPageSize + 1;
  }

  get expedientesRangeEnd(): number {
    return Math.min(
      this.expedientesPage * this.expedientesPageSize,
      this.filteredExpedientes.length,
    );
  }

  private updatePagedExpedientes(): void {
    const totalPages = this.totalExpedientesPages;

    if (this.expedientesPage > totalPages) {
      this.expedientesPage = totalPages;
    }

    if (this.expedientesPage < 1) {
      this.expedientesPage = 1;
    }

    const start = (this.expedientesPage - 1) * this.expedientesPageSize;
    const end = start + this.expedientesPageSize;

    this.pagedExpedientes = this.filteredExpedientes.slice(start, end);
  }

  prevExpedientesPage(): void {
    if (this.expedientesPage <= 1) return;
    this.expedientesPage--;
    this.updatePagedExpedientes();
  }

  nextExpedientesPage(): void {
    if (this.expedientesPage >= this.totalExpedientesPages) return;
    this.expedientesPage++;
    this.updatePagedExpedientes();
  }

  crearExpedienteOpen = false;

  openCrearExpediente(): void {
    this.crearExpedienteOpen = true;
  }

  onExpedienteCreated(): void {
    this.load();
  }

  close(): void {
    this.open = false;
    this.expedientesPage = 1;
    this.closed.emit();
  }
}
