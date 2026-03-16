import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

type DocumentOrigin = 'ESCANEADO' | 'ELECTRONICO';
type UploadMode = 'FILES' | 'FOLDER';

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

  documentOrigin: DocumentOrigin = 'ESCANEADO';
  mode: UploadMode = 'FILES';

  selectedFiles: File[] = [];
  isDragging = false;
  isUploading = false;
  hasTriedUpload = false;

  errorMessage = '';
  uploadResult: any = null;

  metadata = {
    tituloBase: '',
    fechaCreacion: this.getToday(),
    tipoDocumental: '',
    unidadResponsable: '',
  };

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
    this.errorMessage = '';
    this.uploadResult = null;
    this.hasTriedUpload = false;
    this.currentStep = 1;
  }

  goToStep(step: number): void {
    if (step === 2 && !this.hasTriedUpload && !this.uploadResult) return;
    this.currentStep = step;
  }

  nextStep(): void {
    if (!this.selectedFiles.length) {
      this.errorMessage = 'Debes seleccionar al menos un archivo PDF.';
      return;
    }

    this.uploadFiles();
  }

  prevStep(): void {
    this.currentStep = 1;
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

  trackByFile(index: number, file: File): string {
    const relativePath = (file as any).webkitRelativePath || '';
    return `${relativePath || file.name}-${file.size}`;
  }

  get canContinue(): boolean {
    return this.selectedFiles.length > 0;
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

  uploadFiles(): void {
    if (!this.selectedFiles.length) {
      this.errorMessage = 'Debes seleccionar al menos un archivo PDF.';
      return;
    }

    this.hasTriedUpload = true;
    this.isUploading = true;
    this.errorMessage = '';
    this.uploadResult = null;

    const formData = new FormData();
    formData.append('origen_documento', this.documentOrigin);
    formData.append('modo_carga', this.mode);
    formData.append('titulo_base', this.metadata.tituloBase);
    formData.append('fecha_creacion', this.metadata.fechaCreacion);
    formData.append('tipo_documental', this.metadata.tipoDocumental);
    formData.append('unidad_responsable', this.metadata.unidadResponsable);

    for (const file of this.selectedFiles) {
      formData.append('files', file);
    }

    this.http.post(this.API_URL, formData).subscribe({
      next: (resp: any) => {
        this.uploadResult = resp;
        this.isUploading = false;
        this.currentStep = 2;
      },
      error: (err) => {
        this.uploadResult = err?.error || null;
        this.errorMessage =
          err?.error?.message ||
          err?.message ||
          `Error ${err?.status || ''} al cargar los archivos.`;

        this.isUploading = false;
        this.currentStep = 2;
      }
    });
  }
}
