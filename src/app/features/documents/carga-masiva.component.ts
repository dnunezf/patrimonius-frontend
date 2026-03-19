import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

type DocumentOrigin = 'ESCANEADO' | 'ELECTRONICO';
type UploadMode = 'FILES' | 'FOLDER';
type PerDocumentMetadata = {
  title: string;
  keywords: string;
  preliminaryClass: string;
  classificationCode: string;
};
type DocumentEntry = {
  key: string;
  file: File;
  metadata: PerDocumentMetadata;
};

@Component({
  selector: 'app-carga-masiva',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './carga-masiva.component.html',
  styleUrls: ['./carga-masiva.component.css'],
})
export class CargaMasivaPageComponent {
  private http = inject(HttpClient);

  currentStep = 1;
  selectedMetadataIndex = 0;

  documentOrigin: DocumentOrigin = 'ESCANEADO';
  mode: UploadMode = 'FILES';

  selectedFiles: File[] = [];
  isDragging = false;
  isUploading = false;
  hasTriedUpload = false;

  errorMessage = '';
  uploadResult: any = null;

  metadataLoteDefaults = {
    fechaCreacion: this.getToday(),
    unidadResponsable: '',
  };
  documentEntries: DocumentEntry[] = [];

  private readonly API_URL = 'http://localhost:3000/documentos/carga-masiva/pdf';

  constructor(private router: Router) {}

  private getToday(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  onClose(): void {
    this.router.navigate(['/dashboard']);
  }

  onCancel(): void {
    this.onClose();
  }

  setOrigin(origin: DocumentOrigin): void {
    this.documentOrigin = origin;
    this.errorMessage = '';
    this.uploadResult = null;
    this.hasTriedUpload = false;
    this.currentStep = 1;
  }

  setMode(mode: UploadMode): void {
    this.mode = mode;
    this.selectedFiles = [];
    this.documentEntries = [];
    this.errorMessage = '';
    this.uploadResult = null;
    this.hasTriedUpload = false;
    this.currentStep = 1;
    this.selectedMetadataIndex = 0;
  }

  goToStep(step: number): void {
    if (step === 2 && !this.selectedFiles.length) return;
    if (step === 3 && !this.hasTriedUpload && !this.uploadResult) return;
    this.currentStep = step;
  }

  nextStep(): void {
    if (!this.selectedFiles.length) {
      this.errorMessage = 'Debes seleccionar al menos un archivo PDF.';
      return;
    }
    this.errorMessage = '';
    this.currentStep = 2;
  }

  prevStep(): void {
    this.currentStep = Math.max(1, this.currentStep - 1);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    this.addFiles(files);
    input.value = '';
  }

  onFolderSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    this.addFiles(files);
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;

    const files = Array.from(event.dataTransfer?.files || []);
    this.addFiles(files);
  }

  addFiles(files: File[]): void {
    const onlyPdf = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    const merged = [...this.selectedFiles, ...onlyPdf];

    const uniqueByKey = new Map<string, File>();
    for (const file of merged) {
      const relativePath = (file as any).webkitRelativePath || '';
      const key = `${relativePath || file.name}-${file.size}`;
      uniqueByKey.set(key, file);
    }

    this.selectedFiles = Array.from(uniqueByKey.values());
    this.syncDocumentEntries();
    this.ensureValidSelectedMetadataIndex();

    this.uploadResult = null;
    this.hasTriedUpload = false;
    this.currentStep = 1;

    if (onlyPdf.length !== files.length) {
      this.errorMessage = 'Solo se permiten archivos PDF.';
    } else {
      this.errorMessage = '';
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.selectedFiles = [...this.selectedFiles];
    this.syncDocumentEntries();
    this.ensureValidSelectedMetadataIndex();

    this.uploadResult = null;
    this.hasTriedUpload = false;
    this.currentStep = 1;

    if (!this.selectedFiles.length) {
      this.errorMessage = '';
    }
  }

  getFileDisplayName(file: File): string {
    const relativePath = (file as any).webkitRelativePath || '';
    return relativePath || file.name;
  }

  getFileKey(file: File): string {
    const relativePath = (file as any).webkitRelativePath || '';
    return `${relativePath || file.name}-${file.size}`;
  }

  trackByEntry(index: number, entry: DocumentEntry): string {
    return entry.key;
  }

  private createDefaultMetadata(file: File): PerDocumentMetadata {
    return {
      title: file.name.replace(/\.pdf$/i, ''),
      keywords: '',
      preliminaryClass: '',
      classificationCode: '',
    };
  }

  private syncDocumentEntries(): void {
    const previous = new Map(this.documentEntries.map((entry) => [entry.key, entry]));
    this.documentEntries = this.selectedFiles.map((file) => {
      const key = this.getFileKey(file);
      const existing = previous.get(key);
      return {
        key,
        file,
        metadata: existing?.metadata ?? this.createDefaultMetadata(file),
      };
    });
  }

  private ensureValidSelectedMetadataIndex(): void {
    if (!this.documentEntries.length) {
      this.selectedMetadataIndex = 0;
      return;
    }

    if (this.selectedMetadataIndex >= this.documentEntries.length) {
      this.selectedMetadataIndex = this.documentEntries.length - 1;
    }
  }

  get canContinue(): boolean {
    return this.selectedFiles.length > 0;
  }

  get hasMissingTitles(): boolean {
    return this.documentEntries.some((entry) => !entry.metadata.title.trim());
  }

  get canUpload(): boolean {
    return this.documentEntries.length > 0 && !this.hasMissingTitles && !this.isUploading;
  }

  get activeDocumentEntry(): DocumentEntry | null {
    return this.documentEntries[this.selectedMetadataIndex] ?? null;
  }

  selectMetadataDocument(index: number): void {
    this.selectedMetadataIndex = index;
  }

  get resultErrors(): any[] {
    const source =
      this.uploadResult?.errores ??
      this.uploadResult?.errors ??
      this.uploadResult?.duplicados ??
      this.uploadResult?.rechazados ??
      [];

    return Array.isArray(source) ? source : [];
  }

  get resultSuccess(): any[] {
    const source =
      this.uploadResult?.importados ??
      this.uploadResult?.exitosos ??
      this.uploadResult?.success ??
      this.uploadResult?.procesados ??
      this.uploadResult?.guardados ??
      [];

    return Array.isArray(source) ? source : [];
  }

  get errorCount(): number {
    const posiblesValores = [
      this.uploadResult?.total_rechazados,
      this.uploadResult?.rechazadosCount,
      this.uploadResult?.rechazadosTotal,
      this.uploadResult?.duplicadosCount,
      this.uploadResult?.erroresCount,
      this.uploadResult?.erroresTotal,
      this.uploadResult?.conError,
      this.uploadResult?.fallidos,
    ];

    const numero = posiblesValores.find((v) => typeof v === 'number');
    if (typeof numero === 'number') return numero;

    return this.resultErrors.length;
  }

  get successCount(): number {
    const posiblesValores = [
      this.uploadResult?.total_importados,
      this.uploadResult?.procesadosCount,
      this.uploadResult?.guardadosCount,
      this.uploadResult?.exitososCount,
      this.uploadResult?.okCount,
    ];

    const numero = posiblesValores.find((v) => typeof v === 'number');
    if (typeof numero === 'number') return numero;

    return this.resultSuccess.length;
  }

  get totalCount(): number {
    const posiblesValores = [
      this.uploadResult?.total_recibidos,
      this.uploadResult?.total,
      this.uploadResult?.totalArchivos,
      this.uploadResult?.cantidad,
    ];

    const numero = posiblesValores.find((v) => typeof v === 'number');
    if (typeof numero === 'number') return numero;

    return this.selectedFiles.length;
  }

  private buildMetadataPorDocumento(): Array<Record<string, unknown>> {
    return this.documentEntries.map((entry) => {
      const perFile = entry.metadata;
      const title = perFile.title.trim();
      const keywords = perFile.keywords
        .split(',')
        .map((keyword) => keyword.trim())
        .filter(Boolean);
      const preliminaryClass = perFile.preliminaryClass.trim();
      const classificationCode = perFile.classificationCode.trim();

      const metadataDocumento: Record<string, unknown> = {
        // Debe coincidir con originalname en backend.
        archivo: entry.file.name,
      };

      if (title) {
        metadataDocumento['title'] = title;
      }

      if (keywords.length) {
        metadataDocumento['keywords'] = keywords;
      }

      if (preliminaryClass) {
        metadataDocumento['preliminaryClass'] = preliminaryClass;
      }

      if (classificationCode) {
        metadataDocumento['classificationCode'] = classificationCode;
      }

      return metadataDocumento;
    });
  }

  private buildMetadataLote(): Record<string, unknown> | null {
    const metadataLote: Record<string, unknown> = {};
    const fechaCreacion = this.metadataLoteDefaults.fechaCreacion.trim();
    const unidadResponsable = this.metadataLoteDefaults.unidadResponsable.trim();

    if (fechaCreacion) {
      metadataLote['creationDate'] = fechaCreacion;
    }

    if (unidadResponsable) {
      metadataLote['responsibleUnit'] = unidadResponsable;
    }

    return Object.keys(metadataLote).length ? metadataLote : null;
  }

  uploadFiles(): void {
    if (!this.selectedFiles.length) {
      this.errorMessage = 'Debes seleccionar al menos un archivo PDF.';
      return;
    }
    if (this.hasMissingTitles) {
      this.errorMessage = 'Todos los documentos deben tener título para poder cargar el lote.';
      return;
    }

    this.hasTriedUpload = true;
    this.isUploading = true;
    this.errorMessage = '';
    this.uploadResult = null;

    const formData = new FormData();
    formData.append('origen_documento', this.documentOrigin);
    formData.append('modo_carga', this.mode);

    for (const file of this.selectedFiles) {
      formData.append('files', file);
    }

    formData.append(
      'metadata_por_documento',
      JSON.stringify(this.buildMetadataPorDocumento())
    );

    const metadataLote = this.buildMetadataLote();
    if (metadataLote) {
      formData.append('metadata_lote', JSON.stringify(metadataLote));
    }

    this.http.post(this.API_URL, formData).subscribe({
      next: (resp: any) => {
        this.uploadResult = resp;
        this.isUploading = false;
        this.currentStep = 3;
      },
      error: (err) => {
        this.uploadResult = err?.error || null;
        this.errorMessage =
          err?.error?.message ||
          err?.message ||
          `Error ${err?.status || ''} al cargar los archivos.`;

        this.isUploading = false;
        this.currentStep = 3;
      }
    });
  }
}
