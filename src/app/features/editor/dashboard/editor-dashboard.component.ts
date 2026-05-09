import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { DocumentService, VDocumentModel } from 'core/services/document.service';
import { FormatStatePipe } from '../../../pipes/capitalize.pipe';
import { environment } from '../../../../environments/environment';


@Component({
  selector: 'app-editor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, FormatStatePipe],
  templateUrl: './editor-dashboard.component.html',
  styleUrls: ['./editor-dashboard.component.css'],
})
export class EditorDashboardComponent implements OnInit {
  overviewCards = [
    { title: 'Crear Documento', description: 'Crear un nuevo documento', icon: 'document-create' },
    { title: 'Consultas', description: 'Revisar documentos', icon: 'catalogo' },
  ];

  filters = {
    author: 'Todos',
    status: 'Todos',
    dateFrom: '',
    dateTo: '',
  };

  authors: string[] = [];
  states = [
    { value: 'CREACION', label: 'Creación' },
    { value: 'EDICION', label: 'Edición' },
    { value: 'FIRMA', label: 'Firma' },
    { value: 'FIRMA_PARCIAL', label: 'Firma parcial' },
  ];

  allDocuments: VDocumentModel[] = [];
  pagedDocuments: VDocumentModel[] = [];
  page = 1;
  pageSize = 7;

  // Modal firma
  signModalOpen = false;
  signLoading = false;
  signError = '';
  selectedPdf: File | null = null;
  signDocId: number | null = null;

  signInfo: {
    documento_id: number;
    titulo: string;
    codigo?: string | null;
    estado: string;
    firmas_requeridas: number;
    firmas_obtenidas: number;
    ya_firmo: boolean;
    puede_firmar: boolean;
    motivo?: string | null;
  } | null = null;

  // ✅ Anexos
  anexos: any[] = [];
  anexosLoading = false;
  anexosError = '';
  selectedAnexoFile: File | null = null;
  anexoDescripcion = '';
  uploadAnexoLoading = false;

  constructor(private docs: DocumentService, private router: Router) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  get totalItems(): number {
    return this.filteredDocuments().length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get rangeEnd(): number {
    return Math.min(this.page * this.pageSize, this.totalItems);
  }

  getIconPath(icon: string): string {
    return `assets/icons/${icon}.png`;
  }

  goToCreate(): void {
    this.router.navigate(['/editor/document/create']);
  }


  onCardClick(card: any, ev: MouseEvent) {
    ev.stopPropagation();
    if (card?.title === 'Crear Documento') {
      this.goToCreate();
    }
    if (card?.title === 'Consultas') {
      this.gotoConsultas();
    }
  }

  gotoConsultas(): void {
    this.router.navigate(['/consulta/aprobados']);
  }


  editarDocumento(id: number): void {
    this.router.navigate([`/editor/document/${id}/edit`]);
  }

  verDocumento(id: number): void {
    const doc = this.allDocuments.find((d) => Number(d.id) === Number(id));

    if (doc && ['FIRMA_PARCIAL', 'ARCHIVADO'].includes(doc.documento_estado)) {
      this.docs.getCurrentSignedPdf(id).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        },
        error: () => {
          this.signError = 'No se pudo abrir el PDF firmado.';
        },
      });
      return;
    }

    this.router.navigate([`/editor/document/${id}/edit`], {
      queryParams: {
        readonly: 1,
        returnTo: '/editor/dashboard',
      },
    });
  }

  loadDocuments(): void {
    this.docs.getDocumentsFromProduction().subscribe({
      next: (rows) => {
        this.allDocuments = rows ?? [];

        const set = new Set<string>();
        for (const d of this.allDocuments) set.add(d.primer_usuario || 'No disponible');
        this.authors = Array.from(set).sort((a, b) => a.localeCompare(b));

        this.page = 1;
        this.repage();
      },
      error: () => {
        this.allDocuments = [];
        this.repage();
      },
    });
  }

  clearFilters(): void {
    this.filters = { author: 'Todos', status: 'Todos', dateFrom: '', dateTo: '' };
    this.page = 1;
    this.repage();
  }

  onFiltersChanged(): void {
    this.page = 1;
    this.repage();
  }

  goPrev(): void {
    if (this.page <= 1) return;
    this.page--;
    this.repage();
  }

  goNext(): void {
    if (this.page >= this.totalPages) return;
    this.page++;
    this.repage();
  }

  private filteredDocuments(): VDocumentModel[] {
    const { author, status, dateFrom, dateTo } = this.filters;

    return (this.allDocuments ?? []).filter((d) => {
      const okAuthor = author === 'Todos' ? true : d.primer_usuario === author;
      const okStatus = status === 'Todos' ? true : d.documento_estado === status;

      const fecha = d.fecha_creacion ? new Date(d.fecha_creacion) : null;

      const okFrom = !dateFrom || !fecha ? true : fecha >= new Date(`${dateFrom}T00:00:00`);
      const okTo = !dateTo || !fecha ? true : fecha <= new Date(`${dateTo}T23:59:59`);

      return okAuthor && okStatus && okFrom && okTo;
    });
  }

  private repage(): void {
    const list = this.filteredDocuments();
    const start = (this.page - 1) * this.pageSize;
    this.pagedDocuments = list.slice(start, start + this.pageSize);
  }

  // =========================
  // MODAL FIRMA
  // =========================
  openSignModal(documentId: number): void {
    this.signModalOpen = true;
    this.signLoading = true;
    this.signError = '';
    this.selectedPdf = null;
    this.signDocId = documentId;
    this.signInfo = null;

    // reset anexos
    this.anexos = [];
    this.anexosLoading = false;
    this.anexosError = '';
    this.selectedAnexoFile = null;
    this.anexoDescripcion = '';
    this.uploadAnexoLoading = false;

    this.docs.getSignatureInfo(documentId).subscribe({
      next: (info) => {
        this.signLoading = false;
        this.signInfo = info;

        if (!info?.puede_firmar) {
          this.signError = info?.motivo || 'No puedes firmar este documento.';
        }

        this.loadAnexos();
      },
      error: (e) => {
        this.signLoading = false;
        this.signError = e?.error?.message || 'No se pudo cargar la información de firma.';
      },
    });
  }

  closeSignModal(): void {
    this.signModalOpen = false;
    this.signLoading = false;
    this.signError = '';
    this.selectedPdf = null;
    this.signDocId = null;
    this.signInfo = null;

    this.anexos = [];
    this.anexosLoading = false;
    this.anexosError = '';
    this.selectedAnexoFile = null;
    this.anexoDescripcion = '';
    this.uploadAnexoLoading = false;
  }

  onPdfSelected(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    const f = input.files?.[0] ?? null;

    if (!f) {
      this.selectedPdf = null;
      return;
    }

    const fileName = String(f.name || '').trim().toLowerCase();
    const fileType = String(f.type || '').trim().toLowerCase();

    const isPdf =
      fileName.endsWith('.pdf') ||
      fileType === 'application/pdf' ||
      fileType === 'application/x-pdf';

    if (!isPdf) {
      this.signError = 'El archivo debe ser un PDF.';
      this.selectedPdf = null;
      input.value = '';
      return;
    }

    this.signError = '';
    this.selectedPdf = f;
  }


  confirmSign(): void {
    if (!this.signDocId) return;

    if (!this.selectedPdf) {
      this.signError = 'Adjunta el PDF firmado antes de confirmar.';
      return;
    }

    this.signError = '';
    this.executeRealSignatureConfirm(this.selectedPdf);
  }

  private executeRealSignatureConfirm(file: File): void {
    if (!this.signDocId) return;

    this.signLoading = true;

    this.docs.confirmSignature(this.signDocId, file).subscribe({
      next: () => {
        this.signLoading = false;
        this.selectedPdf = null;
        this.loadDocuments();
        this.closeSignModal();
      },
      error: (e) => {
        this.signLoading = false;
        this.signError =
          e?.error?.message || 'La firma fue válida, pero no se pudo confirmar.';
      },
    });
  }

  downloadPdf(): void {
    if (!this.signDocId) return;

    this.docs.downloadPdfForSignature(this.signDocId).subscribe({
      next: (blob) => this.saveBlob(blob, `documento_${this.signDocId}.pdf`),
      error: () => (this.signError = 'No se pudo descargar el PDF.'),
    });
  }

  downloadDocx(): void {
    if (!this.signDocId) return;

    this.docs.downloadDocxForSignature(this.signDocId).subscribe({
      next: (blob) => this.saveBlob(blob, `documento_${this.signDocId}.docx`),
      error: () => (this.signError = 'No se pudo descargar el DOCX.'),
    });
  }

  // =========================
  // ANEXOS
  // =========================
  loadAnexos(): void {
    if (!this.signDocId) return;

    this.anexosLoading = true;
    this.anexosError = '';

    this.docs.listAnexos(this.signDocId).subscribe({
      next: (rows) => {
        this.anexosLoading = false;
        this.anexos = rows ?? [];
      },
      error: (e) => {
        this.anexosLoading = false;
        this.anexosError = e?.error?.message || 'No se pudieron cargar los anexos.';
      },
    });
  }

  onAnexoSelected(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    this.selectedAnexoFile = input.files?.[0] ?? null;
  }

  uploadAnexo(): void {
    if (!this.signDocId) return;

    if (!this.selectedAnexoFile) {
      this.anexosError = 'Debes seleccionar un archivo anexo.';
      return;
    }

    this.uploadAnexoLoading = true;
    this.anexosError = '';

    this.docs
      .uploadAnexo(this.signDocId, this.selectedAnexoFile, this.anexoDescripcion)
      .subscribe({
        next: () => {
          this.uploadAnexoLoading = false;
          this.selectedAnexoFile = null;
          this.anexoDescripcion = '';
          this.loadAnexos();
        },
        error: (e) => {
          this.uploadAnexoLoading = false;
          this.anexosError = e?.error?.message || 'No se pudo subir el anexo.';
        },
      });
  }

  downloadAnexo(anexoId: number, nombre: string): void {
    if (!this.signDocId) return;

    this.docs.downloadAnexo(this.signDocId, anexoId).subscribe({
      next: (blob) => this.saveBlob(blob, nombre),
      error: () => {
        this.anexosError = 'No se pudo descargar el anexo.';
      },
    });
  }

  deleteAnexo(anexoId: number): void {
    if (!this.signDocId) return;

    this.docs.deleteAnexo(this.signDocId, anexoId).subscribe({
      next: () => {
        this.loadAnexos();
      },
      error: (e) => {
        this.anexosError = e?.error?.message || 'No se pudo eliminar el anexo.';
      },
    });
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

}
