import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AsignarPlazoDialogComponent } from './asignar-plazo-dialog.component';
import { DocumentoPlazoRow, DocumentService } from '../../../../core/services/document.service';

@Component({
  selector: 'app-gestion-plazos',
  standalone: true,
  imports: [CommonModule, FormsModule, AsignarPlazoDialogComponent],
  templateUrl: './gestion-plazos.component.html',
  styleUrls: ['./gestion-plazos.component.css']
})
export class GestionPlazosComponent implements OnInit {
  documentos: DocumentoPlazoRow[] = [];
  loading = false;
  error = '';

  filtroTexto = '';
  filtroEstado = '';
  filtroTipo = '';

  asignarOpen = false;
  selectedDocumento: DocumentoPlazoRow | null = null;

  constructor(
    private readonly documentService: DocumentService,
    private readonly router: Router,
  ) {}

  volverDashboard(): void {
    this.router.navigate(['/archivista/dashboard']);
  }

  ngOnInit(): void {
    this.cargarPlazos();
  }

  cargarPlazos(): void {
    this.loading = true;
    this.error = '';

    this.documentService.listarPlazos({
      texto: this.filtroTexto || undefined,
      estado_conservacion: this.filtroEstado || undefined,
      plazo_tipo: this.filtroTipo || undefined
    }).subscribe({
      next: (data) => {
        this.documentos = data.map(doc => ({
          ...doc,
          asignado_por_correo: doc.asignado_por_correo || 'No asignado'
        }));
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.error || 'No se pudieron cargar los plazos.';
        this.loading = false;
      }
    });
  }

  abrirAsignar(documento: DocumentoPlazoRow): void {
    this.selectedDocumento = documento;
    this.asignarOpen = true;
  }

  cerrarAsignar(): void {
    this.asignarOpen = false;
    this.selectedDocumento = null;
  }

  onSaved(): void {
    this.cerrarAsignar();
    this.cargarPlazos();
  }

  limpiarFiltros(): void {
    this.filtroTexto = '';
    this.filtroEstado = '';
    this.filtroTipo = '';
    this.cargarPlazos();
  }

  formatearPlazo(doc: DocumentoPlazoRow): string {
    if (doc.plazo_valor == null || !doc.plazo_unidad) {
      return '—';
    }

    return `${doc.plazo_valor} ${doc.plazo_unidad}`;
  }

  getEstadoClass(estado: string | null): string {
    switch (estado) {
      case 'VIGENTE':
        return 'badge vigente';
      case 'PROXIMO_A_VENCER':
        return 'badge proximo';
      case 'VENCIDO':
        return 'badge vencido';
      default:
        return 'badge';
    }
  }
}
