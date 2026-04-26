import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  HttpClient,
  HttpErrorResponse,
  HttpEvent,
  HttpEventType,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import {
  DocumentService,
  UnidadOption,
  SerieOption,
  SubserieOption,
  ExpedienteOption,
  NivelAccesoOption,
} from '../../../core/services/document.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../environments/environment';

type DocumentOrigin = 'ESCANEADO' | 'ELECTRONICO';
type UploadMode = 'FILES' | 'FOLDER';

type PerDocumentMetadata = {
  codigoReferencia: string;
  tamanoBytes: number;
  formato: string;
  fechaInicio: string;
  fechaCaducidad: string;

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
  anexos: File[];
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
export class CargaMasivaPageComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private documentService = inject(DocumentService);
  private auth = inject(AuthService);

  currentStep = 1;
  selectedMetadataIndex = 0;

  documentOrigin: DocumentOrigin = 'ELECTRONICO';
  private currentUploadMode: UploadMode = 'FILES';

  selectedFiles: File[] = [];
  isDragging = false;
  isUploading = false;
  hasTriedUpload = false;

  errorMessage = '';
  uploadResult: any = null;
  uploadProgress = 0;

  documentEntries: DocumentEntry[] = [];

  unidadesProductoras: UnidadOption[] = [];
  series: SerieOption[] = [];
  nivelesAcceso: NivelAccesoOption[] = [];

  uploadStartedAt: number | null = null;
  elapsedUploadSeconds = 0;

  private keepAliveSub: Subscription | null = null;
  private elapsedTimerSub: Subscription | null = null;

  private readonly API_URL = `${environment.api}/documentos/carga-masiva/pdf`;

  readonly maxFileSizeMb = 150;
  readonly maxFilesPerBatch = 100;
  readonly maxTotalBatchMb = 1024;
  readonly maxCodigoReferenciaLength = 60;
  readonly maxTituloDocumentoLength = 255;

  readonly maxAnexoSizeMb = 100;

  readonly allowedAnexoExtensions = [
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.jpg',
    '.jpeg',
    '.png',
    '.txt',
    '.csv',
    '.zip',
  ];

  readonly allowedAnexoAccept =
    '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt,.csv,.zip';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadCatalogos();
  }

  ngOnDestroy(): void {
    this.stopUploadProtection();
    this.auth.setLongRunningProcess(false);
  }

  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.isUploading && !this.documentEntries.length) return;

    event.preventDefault();
    event.returnValue = '';
  }

  private startUploadProtection(): void {
    this.auth.setLongRunningProcess(true);
    this.stopUploadProtection();

    this.uploadStartedAt = Date.now();
    this.elapsedUploadSeconds = 0;

    this.elapsedTimerSub = interval(1000).subscribe(() => {
      if (!this.uploadStartedAt) return;
      this.elapsedUploadSeconds = Math.floor(
        (Date.now() - this.uploadStartedAt) / 1000,
      );
    });

    this.keepAliveSub = interval(60 * 1000).subscribe(() => {
      if (!this.isUploading) return;

      this.auth.refreshSession().subscribe({
        next: (resp) => {
          this.auth.setSessionSilently(resp);
        },
        error: () => {
          // No hacemos logout aquí.
          // Si luego una petición falla por auth, el interceptor se encarga.
        },
      });
    });
  }

  private stopUploadProtection(): void {
    this.auth.setLongRunningProcess(false);
    this.keepAliveSub?.unsubscribe();
    this.keepAliveSub = null;

    this.elapsedTimerSub?.unsubscribe();
    this.elapsedTimerSub = null;

    this.uploadStartedAt = null;
    this.elapsedUploadSeconds = 0;
  }

  get elapsedUploadLabel(): string {
    const total = this.elapsedUploadSeconds;
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    return `${hh}:${mm}:${ss}`;
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

  private computeFechaCaducidad(
    fechaInicio: string,
    plazo: number | null,
  ): string {
    if (!fechaInicio || plazo == null || plazo <= 0) return '';

    const [year, month, day] = fechaInicio.split('-').map(Number);
    const out = new Date(year, month - 1, day);

    out.setFullYear(out.getFullYear() + Number(plazo));

    const yyyy = out.getFullYear();
    const mm = String(out.getMonth() + 1).padStart(2, '0');
    const dd = String(out.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  }

  private toUpperValue(value: string | null | undefined): string {
    return String(value || '').toUpperCase();
  }

  onCodigoReferenciaInput(entry: DocumentEntry): void {
    entry.metadata.codigoReferencia = this.toUpperValue(
      entry.metadata.codigoReferencia,
    );
  }

  onTituloDocumentoInput(entry: DocumentEntry): void {
    entry.metadata.tituloDocumento = this.toUpperValue(
      entry.metadata.tituloDocumento,
    );
  }

  onPalabrasClaveInput(entry: DocumentEntry): void {
    entry.metadata.palabrasClave = this.toUpperValue(
      entry.metadata.palabrasClave,
    );
  }

  onNombreProductoresInput(entry: DocumentEntry): void {
    entry.metadata.nombreProductores = this.toUpperValue(
      entry.metadata.nombreProductores,
    );
  }

  formatTamano(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';

    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(2)} KB`;
    }

    const mb = kb / 1024;
    if (mb < 1024) {
      return `${mb.toFixed(2)} MB`;
    }

    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  }

  get totalSelectedBytes(): number {
    return this.selectedFiles.reduce((sum, file) => sum + (file.size || 0), 0);
  }

  get totalSelectedSizeLabel(): string {
    return this.formatTamano(this.totalSelectedBytes);
  }

  get totalSelectedMb(): number {
    return this.totalSelectedBytes / (1024 * 1024);
  }

  get totalBatchPercent(): number {
    return Math.max(this.totalSizePercent, this.fileCountPercent);
  }

  get batchStatusClass(): string {
    if (!this.selectedFiles.length) return 'is-empty';

    if (this.exceedsTotalBatchLimit || this.exceedsFileCountLimit) {
      return 'is-danger';
    }

    const nearSizeLimit = this.totalSelectedMb >= this.maxTotalBatchMb * 0.85;
    const nearFileLimit =
      this.selectedFiles.length >= this.maxFilesPerBatch * 0.85;

    if (nearSizeLimit || nearFileLimit) {
      return 'is-warning';
    }

    return 'is-ok';
  }

  get batchStatusMessage(): string {
    if (!this.selectedFiles.length) {
      return 'Aún no has agregado documentos al lote.';
    }

    if (this.exceedsFileCountLimit && this.exceedsTotalBatchLimit) {
      return `El lote supera los límites permitidos: máximo ${this.maxFilesPerBatch} archivos y máximo ${this.maxTotalBatchMb} MB en total.`;
    }

    if (this.exceedsFileCountLimit) {
      return `El lote supera el máximo permitido de ${this.maxFilesPerBatch} archivos. Debes quitar uno o más documentos para continuar.`;
    }

    if (this.exceedsTotalBatchLimit) {
      return `El lote supera el máximo permitido de ${this.maxTotalBatchMb} MB. Debes quitar uno o más archivos para continuar.`;
    }

    const nearFileLimit =
      this.selectedFiles.length >= this.maxFilesPerBatch * 0.85;
    const nearSizeLimit = this.totalSelectedMb >= this.maxTotalBatchMb * 0.85;

    if (nearFileLimit && nearSizeLimit) {
      return 'El lote está cerca del límite máximo de archivos y tamaño permitido.';
    }

    if (nearFileLimit) {
      return `El lote está cerca del límite máximo de ${this.maxFilesPerBatch} archivos.`;
    }

    if (nearSizeLimit) {
      return `El lote está cerca del límite máximo permitido de ${this.maxTotalBatchMb} MB.`;
    }

    return 'El lote se encuentra dentro de los límites permitidos.';
  }

  get missingRequiredDocumentsCount(): number {
    return this.documentEntries.filter(
      (entry) => !this.isEntryRequiredMetadataComplete(entry),
    ).length;
  }

  get readyDocumentsCount(): number {
    return this.documentEntries.filter((entry) =>
      this.isEntryRequiredMetadataComplete(entry),
    ).length;
  }

  get exceedsTotalBatchLimit(): boolean {
    return this.totalSelectedMb > this.maxTotalBatchMb;
  }

  get exceedsFileCountLimit(): boolean {
    return this.selectedFiles.length > this.maxFilesPerBatch;
  }

  get fileCountPercent(): number {
    if (!this.maxFilesPerBatch) return 0;

    const percent = Math.round(
      (this.selectedFiles.length / this.maxFilesPerBatch) * 100,
    );

    return Math.min(percent, 100);
  }

  get totalSizePercent(): number {
    if (!this.maxTotalBatchMb) return 0;

    const percent = Math.round(
      (this.totalSelectedMb / this.maxTotalBatchMb) * 100,
    );

    return Math.min(percent, 100);
  }

  get totalAnexosCount(): number {
    return this.documentEntries.reduce(
      (total, entry) => total + entry.anexos.length,
      0,
    );
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
    this.currentUploadMode = mode;
  }

  goToStep(step: number): void {
    if (step === 2 && !this.selectedFiles.length) return;
    if (step === 3 && !this.hasTriedUpload && !this.uploadResult) return;
    this.currentStep = step;
  }

  nextStep(): void {
    const validationError = this.validateBatchBeforeContinuing();
    if (validationError) {
      this.errorMessage = validationError;
      return;
    }

    this.errorMessage = '';
    this.currentStep = 2;
  }

  prevStep(): void {
    if (this.currentStep === 3) {
      this.clearSelectedBatch();
      this.currentStep = 1;
      return;
    }

    this.currentStep = Math.max(1, this.currentStep - 1);
  }

  onFileSelected(event: Event): void {
    this.currentUploadMode = 'FILES';

    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    this.addFiles(files);
    input.value = '';
  }

  onFolderSelected(event: Event): void {
    this.currentUploadMode = 'FOLDER';

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
    this.currentUploadMode = 'FILES';

    const files = Array.from(event.dataTransfer?.files || []);
    this.addFiles(files);
  }

  addFiles(files: File[]): void {
    const errors: string[] = [];

    const onlyPdf = files.filter((f) => {
      const isPdf =
        f.name.toLowerCase().endsWith('.pdf') ||
        f.type.toLowerCase() === 'application/pdf';

      if (!isPdf) {
        errors.push(`"${f.name}" no es un archivo PDF válido.`);
      }

      return isPdf;
    });

    const tooLargeFiles = onlyPdf.filter(
      (f) => f.size > this.maxFileSizeMb * 1024 * 1024,
    );

    if (tooLargeFiles.length) {
      for (const file of tooLargeFiles) {
        errors.push(
          `"${file.name}" supera el máximo permitido de ${this.maxFileSizeMb} MB por archivo.`,
        );
      }
    }

    const validFiles = onlyPdf.filter(
      (f) => f.size <= this.maxFileSizeMb * 1024 * 1024,
    );

    const merged = [...this.selectedFiles, ...validFiles];

    const uniqueByKey = new Map<string, File>();
    for (const file of merged) {
      const relativePath = (file as any).webkitRelativePath || '';
      const key = `${relativePath || file.name}-${file.size}`;
      uniqueByKey.set(key, file);
    }

    const nextFiles = Array.from(uniqueByKey.values());

    if (nextFiles.length > this.maxFilesPerBatch) {
      errors.push(
        `Solo se permiten ${this.maxFilesPerBatch} archivos por lote. Quita ${
          nextFiles.length - this.maxFilesPerBatch
        } archivo(s) para continuar.`,
      );
    }

    const totalBytes = nextFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    const maxTotalBytes = this.maxTotalBatchMb * 1024 * 1024;

    if (totalBytes > maxTotalBytes) {
      errors.push(
        `El lote supera el tamaño máximo permitido de ${this.maxTotalBatchMb} MB en total.`,
      );
    }

    this.selectedFiles = nextFiles;
    this.syncDocumentEntries();
    this.ensureValidSelectedMetadataIndex();

    this.uploadResult = null;
    this.hasTriedUpload = false;
    this.currentStep = 1;
    this.uploadProgress = 0;
    this.stopUploadProtection();

    this.errorMessage = errors.length ? errors.join(' ') : '';
    this.updateCargaMasivaProtection();
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.selectedFiles = [...this.selectedFiles];
    this.syncDocumentEntries();
    this.ensureValidSelectedMetadataIndex();

    this.uploadResult = null;
    this.hasTriedUpload = false;
    this.currentStep = 1;
    this.uploadProgress = 0;
    this.stopUploadProtection();

    const validationError = this.validateBatchBeforeContinuing();
    this.errorMessage = validationError || '';

    this.updateCargaMasivaProtection();
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

    return {
      codigoReferencia: this.buildReferenceSuggestion(file.name),
      tamanoBytes: file.size,
      formato: 'PDF',
      fechaInicio,
      fechaCaducidad: '',

      unidadProductoraId: null,
      tituloDocumento: this.toUpperValue(file.name.replace(/\.pdf$/i, '')),
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
    const previous = new Map(
      this.documentEntries.map((entry) => [entry.key, entry]),
    );

    this.documentEntries = this.selectedFiles.map((file, index) => {
      const key = this.getFileKey(file);
      const existing = previous.get(key);

      const metadata =
        existing?.metadata ?? this.createDefaultMetadata(file, index);

      return {
        key,
        file,
        anexos: existing?.anexos ?? [],
        metadata,
        subseriesDisponibles: existing?.subseriesDisponibles ?? [],
        expedientesDisponibles: existing?.expedientesDisponibles ?? [],
      };
    });

    this.documentEntries.forEach((entry) => {
      entry.metadata.tamanoBytes = entry.file.size;
      entry.metadata.formato = 'PDF';
      entry.metadata.codigoReferencia = this.toUpperValue(
        entry.metadata.codigoReferencia,
      );
      entry.metadata.tituloDocumento = this.toUpperValue(
        entry.metadata.tituloDocumento,
      );
      entry.metadata.palabrasClave = this.toUpperValue(
        entry.metadata.palabrasClave,
      );
      entry.metadata.nombreProductores = this.toUpperValue(
        entry.metadata.nombreProductores,
      );

      if (
        entry.metadata.fechaInicio &&
        entry.metadata.plazoConservacionAnios != null &&
        entry.metadata.plazoConservacionAnios > 0
      ) {
        entry.metadata.fechaCaducidad = this.computeFechaCaducidad(
          entry.metadata.fechaInicio,
          entry.metadata.plazoConservacionAnios,
        );
      } else {
        entry.metadata.fechaCaducidad = '';
      }
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
    return this.selectedFiles.length > 0 && !this.validateBatchBeforeContinuing();
  }

  get hasMissingTitles(): boolean {
    return this.documentEntries.some((entry) => {
      const m = entry.metadata;
      return (
        !m.codigoReferencia.trim() ||
        !m.unidadProductoraId ||
        !m.tituloDocumento.trim() ||
        !m.nivelAcceso ||
        !m.serieId ||
        !m.subserieId ||
        !m.expedienteId ||
        !m.plazoConservacionAnios
      );
    });
  }

  get hasInvalidCodigoReferenciaLength(): boolean {
    return this.documentEntries.some(
      (entry) =>
        entry.metadata.codigoReferencia.trim().length >
        this.maxCodigoReferenciaLength,
    );
  }

  get hasInvalidTituloLength(): boolean {
    return this.documentEntries.some(
      (entry) =>
        entry.metadata.tituloDocumento.trim().length >
        this.maxTituloDocumentoLength,
    );
  }

  get canUpload(): boolean {
    return (
      this.documentEntries.length > 0 &&
      !this.hasMissingTitles &&
      !this.hasInvalidCodigoReferenciaLength &&
      !this.hasInvalidTituloLength &&
      !this.exceedsTotalBatchLimit &&
      !this.exceedsFileCountLimit &&
      !this.isUploading
    );
  }

  get activeDocumentEntry(): DocumentEntry | null {
    return this.documentEntries[this.selectedMetadataIndex] ?? null;
  }

  selectMetadataDocument(index: number): void {
    this.selectedMetadataIndex = index;
  }

  isEntryRequiredMetadataComplete(entry: DocumentEntry): boolean {
    const m = entry.metadata;

    return !!(
      m.codigoReferencia.trim() &&
      m.unidadProductoraId &&
      m.tituloDocumento.trim() &&
      m.nivelAcceso &&
      m.serieId &&
      m.subserieId &&
      m.expedienteId &&
      m.plazoConservacionAnios
    );
  }

  getEntryStatusLabel(entry: DocumentEntry): string {
    return this.isEntryRequiredMetadataComplete(entry)
      ? 'Metadatos obligatorios listos'
      : 'Faltan campos obligatorios';
  }

  getEntryStatusClass(entry: DocumentEntry): string {
    return this.isEntryRequiredMetadataComplete(entry) ? 'is-ready' : 'is-pending';
  }

  removeEntryFromMetadata(index: number, event?: MouseEvent): void {
    event?.stopPropagation();
    this.removeFile(index);
  }

  private isAllowedAnexo(file: File): boolean {
    const name = file.name.toLowerCase();
    return this.allowedAnexoExtensions.some((ext) => name.endsWith(ext));
  }

  onAnexosSelected(entry: DocumentEntry, event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    const errors: string[] = [];

    const nextAnexos = [...entry.anexos];

    for (const file of files) {
      if (!this.isAllowedAnexo(file)) {
        errors.push(`"${file.name}" no tiene un formato permitido para anexos.`);
        continue;
      }

      if (file.size > this.maxAnexoSizeMb * 1024 * 1024) {
        errors.push(
          `"${file.name}" supera el máximo permitido de ${this.maxAnexoSizeMb} MB por anexo.`,
        );
        continue;
      }

      const exists = nextAnexos.some(
        (existing) =>
          existing.name === file.name &&
          existing.size === file.size &&
          existing.lastModified === file.lastModified,
      );

      if (!exists) {
        nextAnexos.push(file);
      }
    }

    entry.anexos = nextAnexos;
    input.value = '';

    this.errorMessage = errors.length ? errors.join(' ') : '';
    this.updateCargaMasivaProtection();
  }

  removeAnexo(entry: DocumentEntry, index: number): void {
    entry.anexos.splice(index, 1);
    entry.anexos = [...entry.anexos];
    this.updateCargaMasivaProtection();
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

  private obtenerPlazoConservacionDesdeSerie(serieId: number | null): number | null {
    if (!serieId) return null;

    const serie = this.series.find((item) => Number(item.id) === Number(serieId));

    const plazo =
      serie?.plazo_conservacion_anios ??
      serie?.plazoConservacionAnios ??
      null;

    if (plazo === null || plazo === undefined || plazo === 0) {
      return null;
    }

    const plazoNumerico = Number(plazo);

    return Number.isFinite(plazoNumerico) && plazoNumerico > 0
      ? plazoNumerico
      : null;
  }

  onSerieChange(entry: DocumentEntry): void {
    entry.metadata.subserieId = null;
    entry.metadata.expedienteId = null;
    entry.subseriesDisponibles = [];
    entry.expedientesDisponibles = [];

    const plazoConservacion = this.obtenerPlazoConservacionDesdeSerie(
      entry.metadata.serieId,
    );

    entry.metadata.plazoConservacionAnios = plazoConservacion;
    entry.metadata.fechaCaducidad = this.computeFechaCaducidad(
      entry.metadata.fechaInicio,
      plazoConservacion,
    );

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
      entry.metadata.plazoConservacionAnios,
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

  private updateCargaMasivaProtection(): void {
    const hayLoteActivo =
      this.documentEntries.length > 0 ||
      this.selectedFiles.length > 0 ||
      this.isUploading;

    this.auth.setLongRunningProcess(hayLoteActivo);
  }

  private buildReferenceSuggestion(fileName: string): string {
    return this.toUpperValue(
      String(fileName || '')
        .replace(/\.pdf$/i, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9-_]/g, '')
        .trim()
        .slice(0, this.maxCodigoReferenciaLength),
    );
  }

  private buildMetadataPorDocumento(): Array<Record<string, unknown>> {
    return this.documentEntries.map((entry, index) => {
      const perFile = entry.metadata;

      const palabrasClave = perFile.palabrasClave
        .split(',')
        .map((keyword) => keyword.trim().toUpperCase())
        .filter(Boolean);

      const nombreProductores = perFile.nombreProductores
        .split(',')
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean);

      const metadataDocumento: Record<string, unknown> = {
        index,
        archivo: entry.file.name,

        codigoReferencia: perFile.codigoReferencia.trim().toUpperCase(),
        unidadProductoraId: perFile.unidadProductoraId,
        tituloDocumento: perFile.tituloDocumento.trim().toUpperCase(),
        nivelAcceso: perFile.nivelAcceso,
        serieId: perFile.serieId,
        subserieId: perFile.subserieId,
        expedienteId: perFile.expedienteId,
        plazoConservacionAnios: perFile.plazoConservacionAnios,

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

  private validateBatchBeforeContinuing(): string | null {
    if (!this.selectedFiles.length) {
      return 'Debes seleccionar al menos un archivo PDF.';
    }

    if (this.exceedsFileCountLimit) {
      return `Solo se permiten ${this.maxFilesPerBatch} archivos por lote.`;
    }

    if (this.exceedsTotalBatchLimit) {
      return `El lote supera el tamaño máximo permitido de ${this.maxTotalBatchMb} MB en total.`;
    }

    return null;
  }

  private validateMetadataBeforeUpload(): string | null {
    if (this.hasMissingTitles) {
      return 'Debes completar los campos obligatorios de todos los documentos antes de cargar el lote.';
    }

    if (this.exceedsFileCountLimit) {
      return `Solo se permiten ${this.maxFilesPerBatch} archivos por lote.`;
    }

    const invalidCodigo = this.documentEntries.find(
      (entry) =>
        entry.metadata.codigoReferencia.trim().length >
        this.maxCodigoReferenciaLength,
    );

    if (invalidCodigo) {
      return `El código de referencia de "${invalidCodigo.file.name}" supera el máximo de ${this.maxCodigoReferenciaLength} caracteres.`;
    }

    const invalidTitulo = this.documentEntries.find(
      (entry) =>
        entry.metadata.tituloDocumento.trim().length >
        this.maxTituloDocumentoLength,
    );

    if (invalidTitulo) {
      return `El título del documento de "${invalidTitulo.file.name}" supera el máximo de ${this.maxTituloDocumentoLength} caracteres.`;
    }

    if (this.exceedsTotalBatchLimit) {
      return `El lote supera el tamaño máximo permitido de ${this.maxTotalBatchMb} MB en total.`;
    }

    return null;
  }

  uploadFiles(): void {
    const batchError = this.validateBatchBeforeContinuing();
    if (batchError) {
      this.errorMessage = batchError;
      return;
    }

    const metadataError = this.validateMetadataBeforeUpload();
    if (metadataError) {
      this.errorMessage = metadataError;
      return;
    }

    this.hasTriedUpload = true;
    this.isUploading = true;
    this.errorMessage = '';
    this.uploadResult = null;
    this.uploadProgress = 0;
    this.startUploadProtection();

    const formData = new FormData();
    formData.append('origen_documento', this.documentOrigin);
    formData.append('modo_carga', this.currentUploadMode);

    for (const file of this.selectedFiles) {
      formData.append('files', file);
    }

    this.documentEntries.forEach((entry, index) => {
      entry.anexos.forEach((anexo) => {
        formData.append(`anexos_${index}`, anexo);
      });
    });

    formData.append(
      'metadata_por_documento',
      JSON.stringify(this.buildMetadataPorDocumento()),
    );

    this.http
      .post(this.API_URL, formData, {
        observe: 'events',
        reportProgress: true,
      })
      .subscribe({
        next: (event: HttpEvent<any>) => {
          if (event.type === HttpEventType.UploadProgress) {
            const total = event.total || 0;
            this.uploadProgress = total
              ? Math.round((event.loaded * 100) / total)
              : 0;
            return;
          }

          if (event.type === HttpEventType.Response) {
            this.uploadResult = event.body;
            this.isUploading = false;
            this.uploadProgress = 100;
            this.hasTriedUpload = true;
            this.currentStep = 3;

            this.stopUploadProtection();

            this.selectedFiles = [];
            this.documentEntries = [];
            this.selectedMetadataIndex = 0;
            this.currentUploadMode = 'FILES';
            this.updateCargaMasivaProtection();
          }
        },
        error: (err: HttpErrorResponse) => {
          this.uploadResult = err?.error || null;
          this.errorMessage =
            err?.error?.message ||
            err?.message ||
            `Error ${err?.status || ''} al cargar los archivos.`;

          this.isUploading = false;
          this.uploadProgress = 0;
          this.currentStep = 3;
          this.stopUploadProtection();
          this.updateCargaMasivaProtection();
        },
      });
  }

  private clearSelectedBatch(): void {
    this.selectedFiles = [];
    this.documentEntries = [];
    this.selectedMetadataIndex = 0;
    this.uploadProgress = 0;
    this.currentUploadMode = 'FILES';
    this.errorMessage = '';
    this.stopUploadProtection();
    this.updateCargaMasivaProtection();
  }
}
