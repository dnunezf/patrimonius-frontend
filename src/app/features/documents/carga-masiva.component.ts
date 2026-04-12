import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  DocumentService,
  UnidadOption,
  SerieOption,
  SubserieOption,
  ExpedienteOption,
  NivelAccesoOption,
} from '../../../core/services/document.service';

type DocumentOrigin = 'ESCANEADO' | 'ELECTRONICO';
type UploadMode = 'FILES' | 'FOLDER';

type PerDocumentMetadata = {
  // Automáticos
  codigoReferencia: string;
  tamanoBytes: number;
  formato: string;
  fechaInicio: string;
  fechaCaducidad: string;

  // Manuales
  unidadProductoraId: number | null;
  tituloDocumento: string;
  palabrasClave: string;
  nombreProductores: string;
  fechaDocumento: string;
  nivelAcceso: 'PUBLIC' | 'INTERNAL' | 'HIGH' | 'RESTRICTED';
  serieId: number | null;
  subserieId: number | null;
  expedienteId: number | null;
  plazoConservacionAnios: number | null;
};

type DocumentEntry = {
  key: string;
  file: File;
  metadata: PerDocumentMetadata;
  subseriesDisponibles: SubserieOption[];
  expedientesDisponibles: ExpedienteOption[];
};

@Component({
  selector: 'app-carga-masiva',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './carga-masiva.component.html',
  styleUrls: ['./carga-masiva.component.css'],
})
export class CargaMasivaPageComponent implements OnInit {
  private http = inject(HttpClient);
  private documentService = inject(DocumentService);

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

  documentEntries: DocumentEntry[] = [];

  unidadesProductoras: UnidadOption[] = [];
  series: SerieOption[] = [];
  nivelesAcceso: NivelAccesoOption[] = [];

  private readonly API_URL = 'http://localhost:3000/documentos/carga-masiva/pdf';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadCatalogos();
  }

  private loadCatalogos(): void {
    this.documentService.getUnidadesCatalogo().subscribe({
      next: (rows) => {
        this.unidadesProductoras = rows || [];
      },
      error: () => {
        this.unidadesProductoras = [];
      },
    });

    this.documentService.getSeriesCatalogo().subscribe({
      next: (rows) => {
        this.series = rows || [];
      },
      error: () => {
        this.series = [];
      },
    });

    this.documentService.getNivelesAccesoCatalogo().subscribe({
      next: (rows) => {
        this.nivelesAcceso = rows || [];
      },
      error: () => {
        this.nivelesAcceso = [];
      },
    });
  }

  private getToday(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private generateReferenceCode(index: number): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `REF-MNCR-${yyyy}${mm}${dd}-${hh}${mi}${ss}-${index + 1}`;
  }

  private computeFechaCaducidad(fechaInicio: string, plazo: number | null): string {
    const base = new Date(fechaInicio);
    const years = Number(plazo || 0);
    const out = new Date(base);
    out.setFullYear(out.getFullYear() + years);
    const yyyy = out.getFullYear();
    const mm = String(out.getMonth() + 1).padStart(2, '0');
    const dd = String(out.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  formatTamano(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';

    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(2)} KB`;
    }

    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
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

  private createDefaultMetadata(file: File, index = 0): PerDocumentMetadata {
    const fechaInicio = this.getToday();
    const plazo = null;

    return {
      codigoReferencia: this.generateReferenceCode(index),
      tamanoBytes: file.size,
      formato: 'PDF',
      fechaInicio,
      fechaCaducidad: this.computeFechaCaducidad(fechaInicio, plazo),

      unidadProductoraId: null,
      tituloDocumento: file.name.replace(/\.pdf$/i, ''),
      palabrasClave: '',
      nombreProductores: '',
      fechaDocumento: '',
      nivelAcceso: 'INTERNAL',
      serieId: null,
      subserieId: null,
      expedienteId: null,
      plazoConservacionAnios: null,
    };
  }

  private syncDocumentEntries(): void {
    const previous = new Map(this.documentEntries.map((entry) => [entry.key, entry]));

    this.documentEntries = this.selectedFiles.map((file, index) => {
      const key = this.getFileKey(file);
      const existing = previous.get(key);

      const metadata = existing?.metadata ?? this.createDefaultMetadata(file, index);

      return {
        key,
        file,
        metadata,
        subseriesDisponibles: existing?.subseriesDisponibles ?? [],
        expedientesDisponibles: existing?.expedientesDisponibles ?? [],
      };
    });

    this.documentEntries.forEach((entry) => {
      entry.metadata.tamanoBytes = entry.file.size;
      entry.metadata.formato = 'PDF';
      entry.metadata.fechaCaducidad = this.computeFechaCaducidad(
        entry.metadata.fechaInicio,
        entry.metadata.plazoConservacionAnios
      );
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
    return this.documentEntries.some((entry) => {
      const m = entry.metadata;
      return (
        !m.unidadProductoraId ||
        !m.tituloDocumento.trim() ||
        !m.nivelAcceso ||
        !m.serieId ||
        !m.expedienteId
      );
    });
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

  onSerieChange(entry: DocumentEntry): void {
    entry.metadata.subserieId = null;
    entry.metadata.expedienteId = null;
    entry.subseriesDisponibles = [];
    entry.expedientesDisponibles = [];

    if (!entry.metadata.serieId) return;

    this.documentService.getSubseriesCatalogo(entry.metadata.serieId).subscribe({
      next: (rows) => {
        entry.subseriesDisponibles = rows || [];
        this.loadExpedientes(entry);
      },
      error: () => {
        entry.subseriesDisponibles = [];
      },
    });
  }

  onSubserieChange(entry: DocumentEntry): void {
    entry.metadata.expedienteId = null;
    entry.expedientesDisponibles = [];
    this.loadExpedientes(entry);
  }

  onUnidadChange(entry: DocumentEntry): void {
    entry.metadata.expedienteId = null;
    entry.expedientesDisponibles = [];
    this.loadExpedientes(entry);
  }

  onPlazoChange(entry: DocumentEntry): void {
    entry.metadata.fechaCaducidad = this.computeFechaCaducidad(
      entry.metadata.fechaInicio,
      entry.metadata.plazoConservacionAnios
    );
  }

  private loadExpedientes(entry: DocumentEntry): void {
    this.documentService
      .getExpedientesCatalogo({
        unidad_id: entry.metadata.unidadProductoraId,
        serie_id: entry.metadata.serieId,
        subserie_id: entry.metadata.subserieId,
        estado: 'ACTIVO',
      })
      .subscribe({
        next: (rows) => {
          entry.expedientesDisponibles = rows || [];
        },
        error: () => {
          entry.expedientesDisponibles = [];
        },
      });
  }

  private buildMetadataPorDocumento(): Array<Record<string, unknown>> {
    return this.documentEntries.map((entry) => {
      const perFile = entry.metadata;

      const palabrasClave = perFile.palabrasClave
        .split(',')
        .map((keyword) => keyword.trim())
        .filter(Boolean);

      const nombreProductores = perFile.nombreProductores
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      const metadataDocumento: Record<string, unknown> = {
        archivo: entry.file.name,

        unidadProductoraId: perFile.unidadProductoraId,
        tituloDocumento: perFile.tituloDocumento.trim(),
        nivelAcceso: perFile.nivelAcceso,
        serieId: perFile.serieId,
        subserieId: perFile.subserieId,
        expedienteId: perFile.expedienteId,
        plazoConservacionAnios: perFile.plazoConservacionAnios,

        codigoReferencia: perFile.codigoReferencia,
        tamanoBytes: perFile.tamanoBytes,
        formato: perFile.formato,
        fechaInicio: perFile.fechaInicio,
        fechaCaducidad: perFile.fechaCaducidad,
      };

      if (palabrasClave.length) {
        metadataDocumento['palabrasClave'] = palabrasClave;
      }

      if (nombreProductores.length) {
        metadataDocumento['nombreProductores'] = nombreProductores;
      }

      if (perFile.fechaDocumento) {
        metadataDocumento['fechaDocumento'] = perFile.fechaDocumento;
      }

      return metadataDocumento;
    });
  }

  uploadFiles(): void {
    if (!this.selectedFiles.length) {
      this.errorMessage = 'Debes seleccionar al menos un archivo PDF.';
      return;
    }

    if (this.hasMissingTitles) {
      this.errorMessage =
        'Debes completar los campos obligatorios de todos los documentos antes de cargar el lote.';
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
      },
    });
  }
}
