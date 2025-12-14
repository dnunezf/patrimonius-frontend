// src/app/editor/dashboard/editor-dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentService, VDocumentModel } from '../../../../core/services/document.service';
import { DatePipe } from '@angular/common';
import { FormatStatePipe } from '../../../pipes/capitalize.pipe';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

type UiState = { label: string; value: string };

@Component({
  selector: 'app-editor-dashboard',
  standalone: true,
  imports: [CommonModule, FormatStatePipe, RouterModule, FormsModule],
  templateUrl: './editor-dashboard.component.html',
  styleUrls: ['./editor-dashboard.component.css'],
  providers: [DatePipe],
})
export class EditorDashboardComponent implements OnInit {
  documents: VDocumentModel[] = [];
  filteredDocuments: VDocumentModel[] = [];
  // 🔹 Ahora solo se muestran las opciones principales sin "Con Plantilla"
  overviewCards = [
    { title: 'Crear Documento', description: 'Nuevo documento', icon: 'plus.png' },
    { title: 'Firmar', description: 'Documentos pendientes', icon: 'signature.png' },
    { title: 'Ingresar', description: 'Documentos externos', icon: 'upload.png' },
  ];

  private readonly STATE_LABELS: Record<string, string> = {
    CREACION: 'Creación',
    EDICION: 'Edición',
    FIRMA: 'Firma',
    FIRMA_PARCIAL: 'Firma parcial',
  };



  constructor(private documentService: DocumentService, private router: Router) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.documentService.getDocumentsFromProduction().subscribe({
      next: (data) => {
        this.documents = data || [];

        // ✅ inicializar lo que muestra la tabla
        this.filteredDocuments = this.documents.slice();

        // ✅ llenar opciones de selects
        this.refreshFilterLists();
      },
      error: (err) => {
        console.error('Error al cargar los documentos', err);
      },
    });
  }


  getIconPath(iconName: string): string {
    return `assets/icons/${iconName}`;
  }

  // 🚀 Navegar a la pantalla de crear documento
  goToCreate(): void {
    this.router.navigate(['/editor', 'document', 'create']);
  }

  editarDocumento(documentoId: number): void {
    if (!documentoId) {
      console.error('ID de documento inválido');
      return;
    }
    this.router.navigate(['/editor', 'document', documentoId, 'edit']);
  }



// ✅ listas para selects
  authors: string[] = [];
  states: UiState[] = [];


// ✅ filtros (sin categoria)
  filters = {
    author: 'Todos',
    status: 'Todos',
    dateFrom: '',
    dateTo: ''
  };

  private normalizeDateOnly(dateStr: string): string {
    // Espera algo ISO o MySQL "YYYY-MM-DD..." y devuelve "YYYY-MM-DD"
    return (dateStr || '').slice(0, 10);
  }

  private refreshFilterLists() {
    // Autores (igual que antes)
    this.authors = Array.from(
      new Set(
        (this.documents || [])
          .map(d => (d.primer_usuario || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    // Estados: label bonito + value real
    const rawStates = Array.from(
      new Set(
        (this.documents || [])
          .map(d => (d.documento_estado || '').trim())
          .filter(Boolean)
      )
    );

    this.states = rawStates.map((s) => ({
      value: s, // valor real: CREACION, EDICION...
      label: this.STATE_LABELS[s] ?? (
        s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      )
    }));

  }


  applyFilters() {
    this.page = 1;

    const author = this.filters.author !== 'Todos' ? this.filters.author : null;
    const status =
      this.filters.status !== 'Todos'
        ? this.filters.status
        : null;


    const from = this.filters.dateFrom ? this.filters.dateFrom : null; // "YYYY-MM-DD"
    const to = this.filters.dateTo ? this.filters.dateTo : null;

    this.filteredDocuments = (this.documents || []).filter(d => {
      const okAuthor = !author || (d.primer_usuario || '').trim() === author;
      const okStatus = !status || (d.documento_estado || '') === status;

      const docDate = this.normalizeDateOnly(d.fecha_creacion || ''); // "YYYY-MM-DD"
      const okFrom = !from || (docDate && docDate >= from);
      const okTo = !to || (docDate && docDate <= to);

      return okAuthor && okStatus && okFrom && okTo;
    });
  }

  clearFilters() {
    this.page = 1;

    this.filters = { author: 'Todos', status: 'Todos', dateFrom: '', dateTo: '' };
    this.filteredDocuments = this.documents.slice();
  }
// ✅ paginación
  page = 1;
  pageSize = 10;

  get totalItems(): number {
    return this.filteredDocuments.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get rangeEnd(): number {
    return Math.min(this.page * this.pageSize, this.totalItems);
  }

  get pagedDocuments(): VDocumentModel[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredDocuments.slice(start, start + this.pageSize);
  }

  goPrev() {
    if (this.page > 1) this.page--;
  }

  goNext() {
    if (this.page < this.totalPages) this.page++;
  }

}

