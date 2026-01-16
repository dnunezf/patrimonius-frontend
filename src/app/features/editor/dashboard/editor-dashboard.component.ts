// src/app/editor/dashboard/editor-dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  DocumentService,
  VDocumentModel,
} from '../../../../core/services/document.service';
import { FormatStatePipe } from '../../../pipes/capitalize.pipe';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

type UiState = { label: string; value: string };

// 👇 Esto debe calzar con lo que responde tu backend
type SignatureInfo = {
  documento_id: number;
  titulo: string;
  estado: string;
  firmas_requeridas: number;
  firmas_obtenidas: number;
  ya_firmo: boolean;
  puede_firmar: boolean;
  motivo?: string | null;
};

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

  // ✅ listas para selects
  authors: string[] = [];
  states: UiState[] = [];

  // ✅ filtros (sin categoria)
  filters = {
    author: 'Todos',
    status: 'Todos',
    dateFrom: '',
    dateTo: '',
  };

  // ✅ paginación
  page = 1;
  pageSize = 10;

  // ✅ modal / firma
  signModalOpen = false;
  signDocId: number | null = null;
  signLoading = false;
  signError: string | null = null;
  selectedPdf: File | null = null;

  // info útil para mostrar en modal (opcional)
  signInfo: SignatureInfo | null = null;

  constructor(private documentService: DocumentService, private router: Router) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.documentService.getDocumentsFromProduction().subscribe({
      next: (data) => {
        this.documents = data || [];
        this.filteredDocuments = this.documents.slice();
        this.page = 1;
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

  // =========================
  // ✅ Firma (modal)
  // =========================
  openSignModal(documentId: number) {
    this.signError = null;
    this.selectedPdf = null;
    this.signDocId = documentId;
    this.signModalOpen = true;
    this.signInfo = null;

    this.signLoading = true;

    this.documentService.getSignatureInfo(documentId).subscribe({
      next: (info: SignatureInfo) => {
        this.signLoading = false;
        this.signInfo = info;

        if (!info?.puede_firmar) {
          this.signError = info?.motivo || 'No puedes firmar este documento.';
        }
      },
      error: (err: HttpErrorResponse) => {
        this.signLoading = false;
        this.signError =
          (err?.error?.message as string) || 'Error consultando firma.';
      },
    });
  }

  closeSignModal() {
    this.signModalOpen = false;
    this.signDocId = null;
    this.selectedPdf = null;
    this.signError = null;
    this.signLoading = false;
    this.signInfo = null;
  }

  onPdfSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      this.signError = 'El archivo debe ser un PDF.';
      this.selectedPdf = null;
      return;
    }

    this.signError = null;
    this.selectedPdf = file;
  }

  confirmSign() {
    if (!this.signDocId) return;

    if (!this.selectedPdf) {
      this.signError = 'Debes adjuntar el PDF firmado.';
      return;
    }

    this.signLoading = true;
    this.signError = null;

    this.documentService.confirmSignature(this.signDocId, this.selectedPdf).subscribe({
      next: () => {
        this.signLoading = false;
        this.closeSignModal();
        this.loadDocuments(); // refresca tabla
      },
      error: (err: HttpErrorResponse) => {
        this.signLoading = false;
        this.signError =
          (err?.error?.message as string) || 'Error confirmando firma.';
      },
    });
  }

  // =========================
  // ✅ Filtros
  // =========================
  private normalizeDateOnly(dateStr: string): string {
    return (dateStr || '').slice(0, 10);
  }

  private refreshFilterLists() {
    // ✅ OJO: acá estaba tu typo Seteduce -> Set
    const authorSet = new Set<string>(
      (this.documents || [])
        .map((d) => (d.primer_usuario || '').trim())
        .filter(Boolean)
    );

    this.authors = Array.from(authorSet).sort((a, b) => a.localeCompare(b));

    const rawStates = Array.from(
      new Set<string>(
        (this.documents || [])
          .map((d) => (d.documento_estado || '').trim())
          .filter(Boolean)
      )
    );

    this.states = rawStates.map((s) => ({
      value: s,
      label:
        this.STATE_LABELS[s] ??
        s
          .toLowerCase()
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }

  applyFilters() {
    this.page = 1;

    const author =
      this.filters.author !== 'Todos' ? this.filters.author : null;

    const status =
      this.filters.status !== 'Todos' ? this.filters.status : null;

    const from = this.filters.dateFrom ? this.filters.dateFrom : null;
    const to = this.filters.dateTo ? this.filters.dateTo : null;

    this.filteredDocuments = (this.documents || []).filter((d) => {
      const okAuthor =
        !author || (d.primer_usuario || '').trim() === author;

      const okStatus = !status || (d.documento_estado || '') === status;

      const docDate = this.normalizeDateOnly(d.fecha_creacion || '');
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

  // =========================
  // ✅ Paginación
  // =========================
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
