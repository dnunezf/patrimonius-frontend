import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule, NgClass, NgFor, NgIf } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, startWith } from 'rxjs/operators';

import { ConfirmService } from '../../../shared/ui/confirm.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { ConservationIntakeService } from '../../../../core/services/conservation-intake.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UnidadService, OrgUnit } from '../../../../core/services/unidad.service';
import { EDITOR_ID } from '../../../shared/data/catalogs';

import {
  ArchivalExpediente,
  ArchivalSeries,
  ArchivalSubseries,
  CandidateDoc,
  ConfidentialityLevel,
  ConservationEadDocumentRow,
  EadExportStatus,
  EligibilityState,
  FinalDocumentFlow,
  IntakePayload,
  ProcedureType,
} from './models';
import { EadExportDialogComponent } from './components/ead-export-dialog/ead-export-dialog.component';
import { DispatchEmailDialogComponent } from './components/dispatch-email-dialog/dispatch-email-dialog.component';

function humanSize(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes)) return '—';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function csvToUniqueArray(value: string): string[] {
  return String(value || '')
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index);
}

type ConservationSearchFilterSnapshot = {
  q: string;
  officialCode: string;
  producingUnit: string;
  dateFrom: string;
  dateTo: string;
  signatureState: string;
};

function defaultConservationSearchFilterSnapshot(): ConservationSearchFilterSnapshot {
  return {
    q: '',
    officialCode: '',
    producingUnit: '',
    dateFrom: '',
    dateTo: '',
    signatureState: 'ALL',
  };
}

function commaEmailsValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value || '').trim();
    if (!value) return { required: true };

    const emails = csvToUniqueArray(value);
    if (!emails.length) return { required: true };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emails.every((email) => emailRegex.test(email))
      ? null
      : { emails: true };
  };
}

@Component({
  selector: 'app-conservation-intake-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgIf,
    NgFor,
    NgClass,
    EadExportDialogComponent,
    DispatchEmailDialogComponent,
  ],
  templateUrl: './conservation-intake.page.component.html',
  styleUrls: ['./conservation-intake.page.component.css'],
})
export class ConservationIntakePageComponent {
  private readonly api = inject(ConservationIntakeService);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly unidadService = inject(UnidadService);

  readonly loading = signal(false);
  readonly referenceCodeLoading = signal(false);
  readonly candidates = signal<CandidateDoc[]>([]);
  readonly selected = signal<CandidateDoc | null>(null);
  
  // Paginación
  readonly currentPage = signal(1);
  readonly pageSize = 6;
  readonly totalCandidates = signal(0);

  // Paginación para documentos en conservación (EAD)
  readonly currentPageEad = signal(1);
  readonly pageSizeEad = 10;

  readonly series = signal<ArchivalSeries[]>([]);
  readonly subseries = signal<ArchivalSubseries[]>([]);
  readonly expedientes = signal<ArchivalExpediente[]>([]);
  readonly producingUnits = signal<OrgUnit[]>([]);
  private lastKnownUnitIdForCatalog: number | null = null;

  readonly duplicateState =
    signal<EligibilityState['duplicateChecked']>('NOT_CHECKED');

  readonly totalPages = computed(() =>
    Math.ceil(this.totalCandidates() / this.pageSize)
  );

  readonly paginatedCandidates = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.candidates().slice(start, end);
  });

  readonly totalPagesEad = computed(() =>
    Math.ceil(this.filteredEadDocuments().length / this.pageSizeEad)
  );

  readonly paginatedEadDocuments = computed(() => {
    const start = (this.currentPageEad() - 1) * this.pageSizeEad;
    const end = start + this.pageSizeEad;
    return this.filteredEadDocuments().slice(start, end);
  });

  readonly selectedCandidatePosition = computed(() => {
    const current = this.selected();
    if (!current) return 0;

    const index = this.candidates().findIndex((item) => item.id === current.id);
    return index >= 0 ? index + 1 : 0;
  });

  readonly workloadText = computed(() => {
    const total = this.totalCandidates();
    const position = this.selectedCandidatePosition();

    if (!total) return '0 documentos pendientes';
    if (!position) return `${total} documentos pendientes`;

    return `${position} de ${total} documentos`;
  });

  /* =========================
   * HU-035 · EAD 2002 export
   * ========================= */

  readonly eadDocumentsLoading = signal(false);
  readonly eadDocuments = signal<ConservationEadDocumentRow[]>([]);
  /** Criterios del último envío del formulario de búsqueda (también filtran el listado EAD). */
  readonly eadFilterCriteria = signal<ConservationSearchFilterSnapshot>(
    defaultConservationSearchFilterSnapshot(),
  );
  readonly filteredEadDocuments = computed(() => {
    const rows = this.eadDocuments();
    const criteria = this.eadFilterCriteria();
    return rows.filter((row) => this.matchesEadListFilters(row, criteria));
  });

  readonly eadListHintText = computed(() => {
    const total = this.eadDocuments().length;
    const shown = this.filteredEadDocuments().length;
    if (!total) return '0 documento(s)';
    if (shown === total) return `${total} documento(s)`;
    return `${shown} de ${total} documento(s)`;
  });

  readonly eadDialogOpen = signal(false);
  readonly eadDialogDocument = signal<ConservationEadDocumentRow | null>(null);

  /* =========================
   * HU-036 · Despacho por correo
   * ========================= */

  readonly dispatchDialogOpen = signal(false);
  readonly dispatchDialogDocument = signal<ConservationEadDocumentRow | null>(
    null,
  );

  readonly totalEadDocuments = computed(() => this.eadDocuments().length);

  /** Solo tabla «Documentos en Conservación» (p. ej. al pulsar la estadística). */
  readonly conservationOnlyView = signal(false);

  readonly procedureOptions: Array<{
    value: ProcedureType;
    label: string;
  }> = [
    { value: 'CONOCIMIENTO', label: 'Conocimiento' },
    { value: 'ARCHIVO', label: 'Archivo' },
    { value: 'RESPUESTA', label: 'Respuesta' },
    { value: 'SEGUIMIENTO', label: 'Seguimiento' },
  ];

  readonly searchForm = this.fb.group({
    q: [''],
    officialCode: [''],
    producingUnit: [''],
    dateFrom: [''],
    dateTo: [''],
    signatureState: ['ALL'],
  });

  readonly archivalForm = this.fb.group({
    officialCode: [{ value: '', disabled: true }, [Validators.required]],
    documentType: [{ value: '', disabled: true }, [Validators.required]],
    title: [{ value: '', disabled: true }, [Validators.required]],

    documentFlow: ['PRODUCED_SENT' as FinalDocumentFlow, [Validators.required]],

    producingUnit: ['', [Validators.required]],
    keywords: [''],
    accessLevel: ['PUBLIC' as ConfidentialityLevel, [Validators.required]],
    procedureType: [null as ProcedureType | null],

    sizeBytes: [{ value: null as number | null, disabled: true }],
    format: [{ value: '', disabled: true }],
    signers: [{ value: '', disabled: true }],
    signedAt: [{ value: '', disabled: true }],
    softwareVersion: [{ value: '', disabled: true }],

    serieId: [null as number | null, [Validators.required]],
    subserieId: [null as number | null],
    expedienteId: [null as number | null, [Validators.required]],

    retentionRuleId: [{ value: 0, disabled: true }],
    retentionStartDateISO: [
      { value: '', disabled: true },
      [Validators.required],
    ],
    retentionEndDateISO: [{ value: '', disabled: true }],

    recipientNameRole: [''],
    recipientInstitution: [''],
    dispatchEmails: [''],

    senderNameRole: [''],
    senderInstitution: [''],
  });

  filteredSubseries(): ArchivalSubseries[] {
    const serieId = Number(this.archivalForm.get('serieId')?.value || 0);
    if (!serieId) return [];

    return this.subseries().filter(
      (item) => item.active !== false && Number(item.serieId) === serieId,
    );
  }

  filteredExpedientes(): ArchivalExpediente[] {
    const serieId = Number(this.archivalForm.get('serieId')?.value || 0);
    const subserieValue = this.archivalForm.get('subserieId')?.value as
      | number
      | null;

    const subserieId = subserieValue != null ? Number(subserieValue) : null;

    return this.expedientes().filter((item) => {
      if (!this.isSelectableExpediente(item)) return false;
      if (serieId && Number(item.serieId) !== serieId) return false;

      if (subserieId != null) {
        return Number(item.subserieId ?? 0) === subserieId;
      }

      return true;
    });
  }

  private isSelectableExpediente(
    item: ArchivalExpediente | null | undefined,
  ): boolean {
    if (!item) return false;

    const state = String(item.state || '')
      .trim()
      .toUpperCase();

    const isActive = !state || state === 'ACTIVO' || state === 'ACTIVE';
    const isOpen = item.open !== false && !item.fechaCierreISO;

    return isActive && isOpen;
  }

  readonly eligibility = computed<EligibilityState>(() => {
    const classificationReady = this.isClassificationReady();
    const flowDataReady = this.hasRequiredFlowData();

    return {
      pdfa: !!this.selected()?.isPDFA,
      signatures: !!this.selected()?.signaturesComplete,
      officialCodeComplete: this.hasCompleteOfficialCode(),
      requiredMetadata: this.hasRequiredArchivalMetadata(),
      classificationReady,
      flowDataReady,
      duplicateChecked: this.duplicateState(),
    };
  });

  readonly canSave = computed(() => {
    const eligibility = this.eligibility();

    return (
      eligibility.pdfa &&
      eligibility.signatures &&
      eligibility.officialCodeComplete &&
      eligibility.requiredMetadata &&
      eligibility.classificationReady &&
      eligibility.flowDataReady &&
      eligibility.duplicateChecked === 'OK' &&
      this.archivalForm.valid &&
      !this.referenceCodeLoading()
    );
  });

  readonly formErrorSummary = computed<string | null>(() => {
    if (!this.archivalForm.touched) return null;

    const missing: string[] = [];

    if (!this.hasCompleteOfficialCode()) {
      missing.push('Código de referencia final');
    }

    if (!this.hasRequiredArchivalMetadata()) {
      if (!this.archivalForm.getRawValue().producingUnit?.trim()) {
        missing.push('Unidad productora');
      }

      if (!this.archivalForm.getRawValue().accessLevel) {
        missing.push('Nivel de acceso');
      }
    }

    if (!this.isClassificationReady()) {
      missing.push('Serie');
      missing.push('Expediente');
    }

    if (!this.archivalForm.getRawValue().retentionStartDateISO) {
      missing.push('Fecha de inicio de vigencia');
    }

    if (!this.hasRequiredFlowData()) {
      if (this.currentFlow() === 'PRODUCED_SENT') {
        if (!this.archivalForm.get('recipientNameRole')?.value?.trim()) {
          missing.push('Destinatario (nombre y cargo)');
        }

        if (!this.archivalForm.get('recipientInstitution')?.value?.trim()) {
          missing.push('Destinatario (institución)');
        }

        if (!this.archivalForm.get('dispatchEmails')?.value?.trim()) {
          missing.push('Correos para despacho');
        }
      }
    }

    const unique = Array.from(new Set(missing));

    return unique.length
      ? `Campos obligatorios pendientes: ${unique.join(', ')}.`
      : null;
  });

  constructor() {
    this.setupDynamicValidators();
    this.setupRetentionPreview();
    this.setupClassificationReset();
    this.setupReferenceCodePreview();
    this.loadArchivalStructure();
    this.search();
    this.loadEadDocuments();
  }

  private toUpperValue(value: string | null | undefined): string {
    return String(value || '').toUpperCase();
  }

  private setSearchControlUpperValue(controlName: string): void {
    const control = this.searchForm.get(controlName);
    if (!control) return;

    control.setValue(this.toUpperValue(control.value), {
      emitEvent: false,
    });
  }

  private setArchivalControlUpperValue(controlName: string): void {
    const control = this.archivalForm.get(controlName);
    if (!control) return;

    control.setValue(this.toUpperValue(control.value), {
      emitEvent: false,
    });
  }

  onSearchUpperInput(
    controlName: 'q' | 'officialCode',
  ): void {
    this.setSearchControlUpperValue(controlName);
  }

  onArchivalUpperInput(
    controlName:
      | 'keywords'
      | 'recipientNameRole'
      | 'recipientInstitution'
      | 'senderNameRole'
      | 'senderInstitution',
  ): void {
    this.setArchivalControlUpperValue(controlName);
  }

  private normalizeSearchFormTextFields(): void {
    this.setSearchControlUpperValue('q');
    this.setSearchControlUpperValue('officialCode');
  }

  private matchesEadListFilters(
    row: ConservationEadDocumentRow,
    f: ConservationSearchFilterSnapshot,
  ): boolean {
    const code = (f.officialCode || '').trim();
    if (code) {
      const hay = (row.officialCode || '').toUpperCase();
      if (!hay.includes(code)) return false;
    }

    const q = (f.q || '').trim();
    if (q) {
      const hay = (row.title || '').toUpperCase();
      if (!hay.includes(q)) return false;
    }

    const unit = (f.producingUnit || '').trim();
    if (unit) {
      const hay = (row.unitName || '').toUpperCase();
      if (!hay.includes(unit)) return false;
    }

    const docRaw = (row.documentDate || row.createdAtISO || '').trim();
    const docDate = docRaw ? docRaw.slice(0, 10) : null;

    if (f.dateFrom) {
      if (!docDate || docDate < f.dateFrom) return false;
    }
    if (f.dateTo) {
      if (!docDate || docDate > f.dateTo) return false;
    }

    return true;
  }

  private normalizeArchivalTextFields(): void {
    this.setArchivalControlUpperValue('keywords');
    this.setArchivalControlUpperValue('recipientNameRole');
    this.setArchivalControlUpperValue('recipientInstitution');
    this.setArchivalControlUpperValue('senderNameRole');
    this.setArchivalControlUpperValue('senderInstitution');
  }

  private setupDynamicValidators(): void {
    const flowControl = this.archivalForm.get('documentFlow');

    flowControl?.valueChanges
      .pipe(startWith(flowControl.value), takeUntilDestroyed(this.destroyRef))
      .subscribe((flow) => {
        const recipientNameRole = this.archivalForm.get('recipientNameRole');
        const recipientInstitution = this.archivalForm.get(
          'recipientInstitution',
        );
        const dispatchEmails = this.archivalForm.get('dispatchEmails');

        const senderNameRole = this.archivalForm.get('senderNameRole');
        const senderInstitution = this.archivalForm.get('senderInstitution');

        if (flow === 'PRODUCED_SENT') {
          recipientNameRole?.setValidators([Validators.required]);
          recipientInstitution?.setValidators([Validators.required]);
          dispatchEmails?.setValidators([commaEmailsValidator()]);

          senderNameRole?.clearValidators();
          senderInstitution?.clearValidators();
        } else {
          recipientNameRole?.clearValidators();
          recipientInstitution?.clearValidators();
          dispatchEmails?.clearValidators();

          senderNameRole?.clearValidators();
          senderInstitution?.clearValidators();
        }

        recipientNameRole?.updateValueAndValidity({ emitEvent: false });
        recipientInstitution?.updateValueAndValidity({ emitEvent: false });
        dispatchEmails?.updateValueAndValidity({ emitEvent: false });
        senderNameRole?.updateValueAndValidity({ emitEvent: false });
        senderInstitution?.updateValueAndValidity({ emitEvent: false });
      });
  }

  private setupRetentionPreview(): void {
    this.archivalForm
      .get('serieId')
      ?.valueChanges.pipe(
        startWith(this.archivalForm.get('serieId')?.value),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.refreshRetentionEndDate());

    this.archivalForm
      .get('retentionStartDateISO')
      ?.valueChanges.pipe(
        startWith(this.archivalForm.get('retentionStartDateISO')?.value),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.refreshRetentionEndDate());
  }

  private setupClassificationReset(): void {
    this.archivalForm
      .get('serieId')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.archivalForm.patchValue(
          {
            subserieId: null,
            expedienteId: null,
            retentionStartDateISO: '',
            retentionEndDateISO: '',
          },
          { emitEvent: false },
        );
      });

    this.archivalForm
      .get('subserieId')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.archivalForm.patchValue(
          {
            expedienteId: null,
            retentionStartDateISO: '',
            retentionEndDateISO: '',
          },
          { emitEvent: false },
        );
      });

    this.archivalForm
      .get('expedienteId')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshRetentionStartDate();
      });
  }

  private setupReferenceCodePreview(): void {
    this.archivalForm
      .get('producingUnit')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.selected()) {
          this.refreshReferenceCodePreview(true);
        }
      });

    this.archivalForm
      .get('documentType')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.selected()) {
          this.refreshReferenceCodePreview(true);
        }
      });
  }

  clearFilters(): void {
    this.searchForm.reset({
      q: '',
      officialCode: '',
      producingUnit: '',
      dateFrom: '',
      dateTo: '',
      signatureState: 'ALL',
    });

    this.eadFilterCriteria.set(defaultConservationSearchFilterSnapshot());
    this.currentPage.set(1);
    this.currentPageEad.set(1);
    this.search();
  }

  // Métodos de paginación
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  prevPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  firstPage(): void {
    this.goToPage(1);
  }

  lastPage(): void {
    this.goToPage(this.totalPages());
  }

  private findMatchingUnit(docUnit: string): string {
    if (!docUnit) return '';
    
    const docUnitUpper = docUnit.toUpperCase().trim();
    
    // Buscar coincidencia exacta primero
    const exactMatch = this.producingUnits().find(unit => 
      unit.name.toUpperCase() === docUnitUpper
    );
    if (exactMatch) return exactMatch.name;
    
    // Buscar coincidencia parcial (contiene)
    const partialMatch = this.producingUnits().find(unit => 
      unit.name.toUpperCase().includes(docUnitUpper) || 
      docUnitUpper.includes(unit.name.toUpperCase())
    );
    if (partialMatch) return partialMatch.name;
    
    // Si no hay coincidencia, devolver el valor original (el select lo mostrará como vacío)
    return '';
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    // Mostrar máximo 5 páginas
    const maxVisible = 5;
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(total, start + maxVisible - 1);

    // Ajustar el inicio si estamos cerca del final
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  // Métodos de paginación para documentos en conservación (EAD)
  goToPageEad(page: number): void {
    if (page < 1 || page > this.totalPagesEad()) return;
    this.currentPageEad.set(page);
  }

  nextPageEad(): void {
    this.goToPageEad(this.currentPageEad() + 1);
  }

  prevPageEad(): void {
    this.goToPageEad(this.currentPageEad() - 1);
  }

  firstPageEad(): void {
    this.goToPageEad(1);
  }

  lastPageEad(): void {
    this.goToPageEad(this.totalPagesEad());
  }

  getPageNumbersEad(): number[] {
    const total = this.totalPagesEad();
    const current = this.currentPageEad();
    const pages: number[] = [];

    // Mostrar máximo 5 páginas
    const maxVisible = 5;
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(total, start + maxVisible - 1);

    // Ajustar el inicio si estamos cerca del final
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  async search(): Promise<void> {
    this.normalizeSearchFormTextFields();
    const raw = this.searchForm.getRawValue();

    this.eadFilterCriteria.set({
      q: String(raw.q ?? ''),
      officialCode: String(raw.officialCode ?? ''),
      producingUnit: String(raw.producingUnit ?? ''),
      dateFrom: String(raw.dateFrom ?? ''),
      dateTo: String(raw.dateTo ?? ''),
      signatureState: String(raw.signatureState ?? 'ALL'),
    });

    this.api.audit('SEARCH_PERFORMED', raw).subscribe();

    if (this.conservationOnlyView()) {
      this.currentPageEad.set(1);
      return;
    }

    this.loading.set(true);
    this.selected.set(null);
    this.duplicateState.set('NOT_CHECKED');
    this.currentPage.set(1);

    this.api.searchCandidates(raw).subscribe({
      next: (rows) => {
        this.candidates.set(rows);
        this.totalCandidates.set(rows.length);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);

        if (err?.status === 401) {
          this.toasts.error('La sesión expiró. Inicie sesión nuevamente.');
          return;
        }

        if (err?.status === 403) {
          this.toasts.error(
            'No tiene permisos para acceder al módulo de conservación.',
          );
          return;
        }

        this.toasts.error(
          err?.error?.message || 'No se pudieron cargar los candidatos.',
        );
      },
    });
  }

  selectDoc(doc: CandidateDoc): void {
    this.selected.set(doc);
    this.duplicateState.set('NOT_CHECKED');

    // Buscar la unidad productora que coincida exactamente con las opciones disponibles
    const matchedUnit = this.findMatchingUnit(doc.producingUnit || '');

    this.archivalForm.reset(
      {
        officialCode: '',
        documentType: doc.documentType || '',
        title: doc.title || '',
        documentFlow: (doc.documentFlow ||
          'PRODUCED_SENT') as FinalDocumentFlow,

        producingUnit: matchedUnit,
        keywords: this.toUpperValue(
          Array.isArray(doc.keywords) ? doc.keywords.join(', ') : '',
        ),
        accessLevel:
          (doc.accessLevel as ConfidentialityLevel | null) || 'PUBLIC',
        procedureType: null,

        sizeBytes: doc.sizeBytes ?? null,
        format: doc.format || '',
        signers: this.signersText(doc),
        signedAt: this.signedAtText(doc),
        softwareVersion: doc.softwareVersion || '',

        serieId: null,
        subserieId: null,
        expedienteId: null,

        retentionRuleId: 0,
        retentionStartDateISO: '',
        retentionEndDateISO: '',

        recipientNameRole: '',
        recipientInstitution: '',
        dispatchEmails: '',

        senderNameRole: '',
        senderInstitution: '',
      },
      { emitEvent: false },
    );

    this.archivalForm.markAsUntouched();
    this.refreshRetentionEndDate();
    this.refreshReferenceCodePreview(false);

    if (this.producingUnits().length) {
      const next = this.resolveSelectedUnitId();
      this.lastKnownUnitIdForCatalog = next;
      this.fetchArchivalLists(next);
    }

    this.api
      .audit('CANDIDATE_SELECTED', {
        id: doc.id,
        officialCode: doc.officialCode,
      })
      .subscribe();
  }

  private loadArchivalStructure(): void {
    this.setupArchivalCatalogOnUnitChange();
    this.loadProducingUnits();
  }

  private setupArchivalCatalogOnUnitChange(): void {
    this.archivalForm
      .get('producingUnit')
      ?.valueChanges.pipe(
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        if (!this.producingUnits().length) return;

        const next = this.resolveSelectedUnitId();
        const shouldReset =
          this.lastKnownUnitIdForCatalog !== null &&
          next !== this.lastKnownUnitIdForCatalog;

        this.lastKnownUnitIdForCatalog = next;

        if (shouldReset) {
          this.archivalForm.patchValue(
            {
              serieId: null,
              subserieId: null,
              expedienteId: null,
              retentionStartDateISO: '',
              retentionEndDateISO: '',
            },
            { emitEvent: false },
          );
        }

        this.fetchArchivalLists(next);
      });
  }

  private resolveSelectedUnitId(): number | null {
    const raw = String(
      this.archivalForm.get('producingUnit')?.value || '',
    ).trim();
    if (!raw) return null;

    const docUnitUpper = raw.toUpperCase();
    const units = this.producingUnits();
    const exact = units.find((u) => u.name.toUpperCase() === docUnitUpper);
    if (exact) return exact.id;

    const partial = units.find(
      (u) =>
        u.name.toUpperCase().includes(docUnitUpper) ||
        docUnitUpper.includes(u.name.toUpperCase()),
    );
    return partial?.id ?? null;
  }

  private fetchArchivalLists(unitId: number | null): void {
    const filter = unitId != null ? { unitId } : undefined;

    this.api.getSeries(filter).subscribe({
      next: (rows) => {
        this.series.set(rows);
        const serieIds = rows.map((r) => r.id);
        const subFilter =
          unitId != null ? { allowedSerieIds: serieIds } : undefined;

        this.api.getSubseries(subFilter).subscribe({
          next: (subRows) => this.subseries.set(subRows),
          error: () =>
            this.toasts.error(
              'No se pudieron cargar las subseries archivísticas.',
            ),
        });
      },
      error: () =>
        this.toasts.error('No se pudieron cargar las series archivísticas.'),
    });

    this.api.getExpedientes(filter).subscribe({
      next: (rows) => this.expedientes.set(rows),
      error: () => this.toasts.error('No se pudieron cargar los expedientes.'),
    });
  }

  private loadProducingUnits(): void {
    this.unidadService.list().subscribe({
      next: (rows) => {
        this.producingUnits.set(rows);
        const next = this.resolveSelectedUnitId();
        this.lastKnownUnitIdForCatalog = next;
        this.fetchArchivalLists(next);
      },
      error: () =>
        this.toasts.error('No se pudieron cargar las unidades productoras.'),
    });
  }

  private refreshReferenceCodePreview(silent: boolean): void {
    const doc = this.selected();
    if (!doc) return;

    const raw = this.archivalForm.getRawValue();
    const documentType = String(raw.documentType || '').trim();
    const producingUnit = this.toUpperValue(raw.producingUnit).trim();

    if (!documentType) {
      this.archivalForm.patchValue({ officialCode: '' }, { emitEvent: false });
      return;
    }

    this.referenceCodeLoading.set(true);

    this.api
      .previewReferenceCode({
        candidateId: doc.id,
        documentType,
        producingUnit,
      })
      .subscribe({
        next: (preview) => {
          this.referenceCodeLoading.set(false);
          this.archivalForm.patchValue(
            { officialCode: preview.referenceCode },
            { emitEvent: false },
          );
        },
        error: (err) => {
          this.referenceCodeLoading.set(false);
          this.archivalForm.patchValue(
            { officialCode: '' },
            { emitEvent: false },
          );

          if (!silent) {
            this.toasts.error(
              err?.error?.message ||
                'No se pudo generar el código de referencia final.',
            );
          }
        },
      });
  }

  async verifyDuplicate(): Promise<void> {
    const code = String(
      this.archivalForm.getRawValue().officialCode || '',
    ).trim();

    if (!code) {
      this.toasts.error(
        'Primero debe generarse el código de referencia final.',
      );
      return;
    }

    this.duplicateState.set('PENDING');

    this.api
      .audit('DUPLICATE_CHECK_REQUESTED', {
        code,
      })
      .subscribe();

    this.api.checkDuplicateOfficialCode(code).subscribe({
      next: async (result) => {
        if (result.status === 'DUPLICATE') {
          this.duplicateState.set('DUPLICATE');

          await this.confirm.ask(
            `Se detectó un código duplicado. Documento existente ID: ${result.existingId}.`,
            'Código duplicado',
          );

          return;
        }

        this.duplicateState.set('OK');
        this.toasts.success('El código oficial fue verificado correctamente.');
      },
      error: (err) => {
        this.duplicateState.set('NOT_CHECKED');

        this.toasts.error(
          err?.error?.message ||
            'No se pudo verificar la duplicidad del código.',
        );
      },
    });
  }

  currentFlow(): FinalDocumentFlow {
    return (
      (this.archivalForm.get('documentFlow')?.value as FinalDocumentFlow) ||
      'PRODUCED_SENT'
    );
  }

  selectedSerie(): ArchivalSeries | null {
    const id = Number(this.archivalForm.get('serieId')?.value || 0);

    return (
      this.series().find((item) => item.id === id && item.active !== false) ||
      null
    );
  }

  selectedSubserie(): ArchivalSubseries | null {
    const id = Number(this.archivalForm.get('subserieId')?.value || 0);
    if (!id) return null;

    return (
      this.subseries().find(
        (item) => item.id === id && item.active !== false,
      ) || null
    );
  }

  selectedExpediente(): ArchivalExpediente | null {
    const id = Number(this.archivalForm.get('expedienteId')?.value || 0);

    return (
      this.expedientes().find(
        (item) => item.id === id && this.isSelectableExpediente(item),
      ) || null
    );
  }

  buildClassificationCode(): string {
    return (
      this.selectedExpediente()?.code ||
      this.selectedSubserie()?.code ||
      this.selectedSerie()?.code ||
      ''
    );
  }

  buildClassificationLabel(): string {
    const parts = [
      this.selectedSerie()?.name,
      this.selectedSubserie()?.name,
      this.selectedExpediente()?.name,
    ].filter(Boolean);

    return parts.join(' / ');
  }

  isClassificationReady(): boolean {
    return !!this.selectedSerie() && !!this.selectedExpediente();
  }

  hasCompleteOfficialCode(): boolean {
    const code = String(
      this.archivalForm.getRawValue().officialCode || '',
    ).trim();

    return code.length >= 8 && !code.startsWith('TMP');
  }

  hasRequiredArchivalMetadata(): boolean {
    const raw = this.archivalForm.getRawValue();

    return (
      !!String(raw.documentType || '').trim() &&
      !!String(raw.title || '').trim() &&
      !!String(raw.producingUnit || '').trim() &&
      !!raw.accessLevel &&
      raw.sizeBytes != null &&
      !!String(raw.format || '').trim()
    );
  }

  hasRequiredFlowData(): boolean {
    if (this.currentFlow() === 'PRODUCED_SENT') {
      return (
        !!this.archivalForm.get('recipientNameRole')?.value?.trim() &&
        !!this.archivalForm.get('recipientInstitution')?.value?.trim() &&
        !this.archivalForm.get('dispatchEmails')?.errors &&
        !!this.archivalForm.get('dispatchEmails')?.value?.trim()
      );
    }

    return true;
  }

  refreshRetentionStartDate(): void {
    const expediente = this.selectedExpediente();
    const selectedDoc = this.selected();

    const startDate =
      expediente?.latestDocumentDateISO || selectedDoc?.createdAtISO || '';

    this.archivalForm.patchValue(
      {
        retentionStartDateISO: startDate ? String(startDate).slice(0, 10) : '',
      },
      { emitEvent: false },
    );

    this.refreshRetentionEndDate();
  }

  refreshRetentionEndDate(): void {
    const serie = this.selectedSerie();
    const start = String(
      this.archivalForm.getRawValue().retentionStartDateISO || '',
    );

    const years = Number((serie as any)?.plazo_conservacion_anios || 0);

    if (!serie || !years || !start) {
      this.archivalForm.patchValue(
        { retentionEndDateISO: '' },
        { emitEvent: false },
      );

      return;
    }

    const date = new Date(`${start}T00:00:00`);
    date.setFullYear(date.getFullYear() + years);

    this.archivalForm.patchValue(
      { retentionEndDateISO: date.toISOString().slice(0, 10) },
      { emitEvent: false },
    );
  }

  retentionPreviewText(): string {
    const serie = this.selectedSerie();
    const start = String(
      this.archivalForm.getRawValue().retentionStartDateISO || '',
    );
    const end = String(
      this.archivalForm.getRawValue().retentionEndDateISO || '',
    );

    const years = Number((serie as any)?.plazo_conservacion_anios || 0);

    if (!serie || !start || !years) {
      return 'Seleccione una serie y un expediente para visualizar la vigencia.';
    }

    return `Inicio: ${start} · Duración: ${years} año(s) · Fin estimado: ${end || '—'}`;
  }

  signersText(doc: CandidateDoc | null): string {
    if (!doc?.signers?.length) return '—';

    return doc.signers.join(', ');
  }

  signedAtText(doc: CandidateDoc | null): string {
    if (!doc?.signedAt?.length) return '—';

    return doc.signedAt
      .map((value) => this.formatDateTime(value))
      .filter(Boolean)
      .join(' · ');
  }

  sizeHuman(): string {
    return humanSize(this.archivalForm.getRawValue().sizeBytes);
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return '—';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('es-CR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  async save(): Promise<void> {
    this.normalizeArchivalTextFields();

    const doc = this.selected();

    if (!doc) {
      this.toasts.error('Seleccione primero un documento.');
      return;
    }

    this.archivalForm.markAllAsTouched();

    if (!this.archivalForm.valid) {
      this.toasts.error('Complete los campos obligatorios.');
      return;
    }

    if (!this.isClassificationReady()) {
      this.toasts.error(
        'Debe seleccionar la serie y el expediente archivístico.',
      );
      return;
    }

    if (this.referenceCodeLoading()) {
      this.toasts.error(
        'Espere a que se genere el código de referencia final.',
      );
      return;
    }

    const eligibility = this.eligibility();

    if (!eligibility.pdfa) {
      this.toasts.error(
        'El documento seleccionado no es elegible para ingreso PDF/A.',
      );
      return;
    }

    if (!eligibility.signatures) {
      this.toasts.error(
        'El documento seleccionado no cumple con el requisito de firmas.',
      );
      return;
    }

    if (!eligibility.officialCodeComplete) {
      this.toasts.error(
        'El documento seleccionado no tiene un código de referencia final válido.',
      );
      return;
    }

    if (!eligibility.requiredMetadata) {
      this.toasts.error(
        'Los metadatos finales obligatorios están incompletos.',
      );
      return;
    }

    if (!eligibility.flowDataReady) {
      this.toasts.error(
        'Complete la información específica del tipo de documento.',
      );
      return;
    }

    if (eligibility.duplicateChecked !== 'OK') {
      this.toasts.error(
        'Debe verificar la duplicidad del código antes de guardar.',
      );
      return;
    }

    const raw = this.archivalForm.getRawValue();
    const accessLevel = raw.accessLevel as ConfidentialityLevel;

    if (accessLevel === 'RESTRICTED') {
      const accepted = await this.confirm.ask(
        'Se seleccionó un nivel de acceso sensible. ¿Desea continuar?',
        'Advertencia',
      );

      if (!accepted) return;
    }

    const confirmed = await this.confirm.ask(
      '¿Confirma el ingreso del documento a conservación?',
      'Confirmar ingreso',
    );

    if (!confirmed) {
      this.api.audit('INTAKE_CANCELLED', { id: doc.id }).subscribe();
      return;
    }

    const serie = this.selectedSerie();
    const subserie = this.selectedSubserie();
    const expediente = this.selectedExpediente();

    if (!serie || !expediente) {
      this.toasts.error('La selección archivística está incompleta.');
      return;
    }

    const keywords = csvToUniqueArray(this.toUpperValue(raw.keywords));
    const documentFlow = raw.documentFlow as FinalDocumentFlow;

    const payload: IntakePayload = {
      candidateId: doc.id,
      officialCode: String(raw.officialCode || '').trim(),
      metadata: {
        documentFlow,
        documentType: String(raw.documentType || '').trim(),
        title: String(raw.title || '').trim(),
        producingUnit: this.toUpperValue(raw.producingUnit).trim(),
        keywords,
        accessLevel,
        procedureType: raw.procedureType || null,
        sizeBytes: raw.sizeBytes ?? null,
        format: String(raw.format || '').trim() || null,
        signers: doc.signers || [],
        signedAt: doc.signedAt || [],
        softwareVersion: String(raw.softwareVersion || '').trim() || null,
      },
      classification: {
        serieId: serie.id,
        subserieId: subserie?.id ?? null,
        expedienteId: expediente.id,
        code: this.buildClassificationCode(),
        label: this.buildClassificationLabel(),
      },
      retention: {
        ruleId: 0,
        startDateISO: String(raw.retentionStartDateISO),
        trackingEnabled: true,
      },
      outgoing:
        documentFlow === 'PRODUCED_SENT'
          ? {
              recipientNameRole: this.toUpperValue(
                raw.recipientNameRole,
              ).trim(),
              recipientInstitution: this.toUpperValue(
                raw.recipientInstitution,
              ).trim(),
              dispatchEmails: csvToUniqueArray(
                String(raw.dispatchEmails || ''),
              ).map((item) => item.toLowerCase()),
            }
          : null,
      incoming:
        documentFlow === 'RECEIVED'
          ? {
              senderNameRole:
                this.toUpperValue(raw.senderNameRole).trim() || null,
              senderInstitution:
                this.toUpperValue(raw.senderInstitution).trim() || null,
            }
          : null,
    };

    this.loading.set(true);
    console.log('Payload conservación:', payload);

    this.api.registerIntake(payload).subscribe({
      next: (response) => {
        this.loading.set(false);

        this.toasts.success(
          `Documento registrado en conservación (${response.officialCode || response.intakeId}).`,
        );

        this.api.audit('INTAKE_SUCCESS', response).subscribe();

        this.selected.set(null);
        this.duplicateState.set('NOT_CHECKED');

        this.archivalForm.reset(
          {
            officialCode: '',
            documentType: '',
            title: '',
            documentFlow: 'PRODUCED_SENT',
            accessLevel: 'INTERNAL',
            procedureType: null,
            retentionRuleId: 0,
            retentionStartDateISO: '',
            retentionEndDateISO: '',
            serieId: null,
            subserieId: null,
            expedienteId: null,
          } as any,
          { emitEvent: true },
        );

        this.search();
        this.loadEadDocuments();
      },
      error: (err) => {
        this.loading.set(false);

        if (err?.status === 401) {
          this.toasts.error('La sesión expiró. Inicie sesión nuevamente.');
          return;
        }

        if (err?.status === 403) {
          this.toasts.error(
            'No tiene permisos para registrar ingresos en conservación.',
          );
          return;
        }

        if (
          err?.status === 409 &&
          err?.error?.error === 'duplicate_official_code'
        ) {
          this.duplicateState.set('DUPLICATE');
          this.toasts.error('Se detectó un código oficial duplicado.');
          return;
        }

        if (
          err?.status === 409 &&
          err?.error?.error === 'duplicate_conservation_document'
        ) {
          this.toasts.error(
            'Este documento ya se encuentra registrado en conservación.',
          );
          return;
        }

        if (err?.status === 422) {
          this.toasts.error('La validación falló. Revise el formulario.');
          return;
        }

        this.toasts.error(
          err?.error?.message ||
            'No se pudo registrar el ingreso a conservación.',
        );
      },
    });
  }

  /* =========================
   * HU-035 · helpers y flujo
   * ========================= */

  /** Solo listado EAD / despacho (oculta búsqueda y registro). */
  showConservationDocumentsOnly(): void {
    this.conservationOnlyView.set(true);
    this.loadEadDocuments();
  }

  /** Vuelve a candidatos + registro archivístico. */
  showFullIntakeWorkflow(): void {
    this.conservationOnlyView.set(false);
  }

  loadEadDocuments(): void {
    this.eadDocumentsLoading.set(true);

    this.api.getConservationDocumentsForEad().subscribe({
      next: (rows) => {
        this.eadDocuments.set(rows || []);
        this.eadDocumentsLoading.set(false);
      },
      error: (err) => {
        this.eadDocumentsLoading.set(false);

        this.toasts.error(
          err?.error?.message ||
            'No se pudieron cargar los documentos en conservación para exportación EAD 2002.',
        );
      },
    });
  }

  openEadDialog(
    row: ConservationEadDocumentRow,
    source: 'view' | 'export' = 'view',
  ): void {
    if (source === 'export' && !this.canExportToEAD()) {
      this.toasts.error('No tiene permisos para exportar a EAD 2002.');
      return;
    }

    this.eadDialogDocument.set(row);
    this.eadDialogOpen.set(true);

    this.api
      .audit('EAD2002_DIALOG_OPENED', {
        documentId: row.id,
        officialCode: row.officialCode,
        source,
      })
      .subscribe();
  }

  closeEadDialog(): void {
    this.eadDialogOpen.set(false);
    this.eadDialogDocument.set(null);
  }

  onEadExported(documentId: number): void {
    this.loadEadDocuments();

    this.api
      .audit('EAD2002_LIST_REFRESH_REQUESTED', {
        documentId,
      })
      .subscribe();
  }

  /* =========================
   * HU-036 · Despacho por correo
   * ========================= */

  openDispatchDialog(row: ConservationEadDocumentRow): void {
    this.dispatchDialogDocument.set(row);
    this.dispatchDialogOpen.set(true);

    this.api
      .audit('DISPATCH_EMAIL_DIALOG_OPENED', {
        documentId: row.id,
        officialCode: row.officialCode,
        title: row.title,
      })
      .subscribe();
  }

  closeDispatchDialog(): void {
    this.dispatchDialogOpen.set(false);
    this.dispatchDialogDocument.set(null);
  }

  onDispatchEmailSent(documentId: number): void {
    this.loadEadDocuments();

    this.api
      .audit('DISPATCH_EMAIL_LIST_REFRESH_REQUESTED', {
        documentId,
      })
      .subscribe();
  }

  eadStatusLabel(status: EadExportStatus | null | undefined): string {
    return status === 'EXPORTADO' ? 'Exportado' : 'No exportado';
  }

  eadStatusClass(status: EadExportStatus | null | undefined): string {
    return status === 'EXPORTADO' ? 'ok' : 'neutral';
  }

  displayConservationState(state: string | null | undefined): string {
    const normalized = String(state || '')
      .trim()
      .toUpperCase();

    if (normalized === 'ARCHIVADO' || normalized === 'CONSERVACION') {
      return 'conservación';
    }

    if (!normalized) return '—';

    return normalized.toLowerCase();
  }

  eadSerieSubserieText(row: ConservationEadDocumentRow): string {
    const parts = [row.serieName, row.subserieName].filter(Boolean);
    return parts.length ? parts.join(' / ') : '—';
  }

  eadSecondaryDocumentText(row: ConservationEadDocumentRow): string {
    const parts = [row.expedienteCode, row.expedienteName].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Sin expediente';
  }

  trackEadRow(_: number, row: ConservationEadDocumentRow): number {
    return row.id;
  }

  fieldErr(name: string): string | null {
    const control = this.archivalForm.get(name);

    if (!control || !control.touched || !control.errors) return null;

    if (control.errors['required']) return 'Obligatorio.';
    if (control.errors['requiredTrue']) return 'Debe activar el seguimiento.';
    if (control.errors['minlength']) return 'Muy corto.';
    if (control.errors['emails']) {
      return 'Ingrese correos válidos separados por coma.';
    }

    return 'Valor inválido.';
  }

  isEditor(): boolean {
    const user = this.auth.currentUser();
    if (!user) return false;

    const singleRoleId = Number(user.rolId ?? 0);
    const multipleRoleIds = Array.isArray(user.rolIds)
      ? user.rolIds.map((id) => Number(id))
      : [];

    return singleRoleId === EDITOR_ID || multipleRoleIds.includes(EDITOR_ID);
  }

  canExportToEAD(): boolean {
    const user = this.auth.currentUser();
    if (!user) return false;

    const roles = (user.roles || [])
      .filter(Boolean)
      .map((role: string) => String(role).trim().toUpperCase());

    return roles.includes('ARCHIVADOR');
  }
}
