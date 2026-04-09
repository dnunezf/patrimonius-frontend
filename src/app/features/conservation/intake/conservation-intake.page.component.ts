import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs/operators';

import { ConfirmService } from '../../../shared/ui/confirm.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { ConservationIntakeService } from '../../../../core/services/conservation-intake.service';

import {
  ArchivalExpediente,
  ArchivalSeries,
  ArchivalSubseries,
  CandidateDoc,
  ConfidentialityLevel,
  EligibilityState,
  FinalDocumentFlow,
  IntakePayload,
  ProcedureType,
  RetentionRule,
} from './models';

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
  imports: [CommonModule, ReactiveFormsModule, NgIf, NgFor, NgClass, DatePipe],
  templateUrl: './conservation-intake.page.component.html',
  styleUrls: ['./conservation-intake.page.component.css'],
})
export class ConservationIntakePageComponent {
  private readonly api = inject(ConservationIntakeService);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly candidates = signal<CandidateDoc[]>([]);
  readonly selected = signal<CandidateDoc | null>(null);
  readonly retentionRules = signal<RetentionRule[]>([]);

  readonly series = signal<ArchivalSeries[]>([]);
  readonly subseries = signal<ArchivalSubseries[]>([]);
  readonly expedientes = signal<ArchivalExpediente[]>([]);

  readonly duplicateState =
    signal<EligibilityState['duplicateChecked']>('NOT_CHECKED');

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
    accessLevel: ['INTERNAL' as ConfidentialityLevel, [Validators.required]],
    procedureType: [null as ProcedureType | null],

    sizeBytes: [{ value: null as number | null, disabled: true }],
    format: [{ value: '', disabled: true }],
    signers: [{ value: '', disabled: true }],
    signedAt: [{ value: '', disabled: true }],
    softwareVersion: [{ value: '', disabled: true }],

    serieId: [null as number | null, [Validators.required]],
    subserieId: [null as number | null],
    expedienteId: [null as number | null, [Validators.required]],

    retentionRuleId: [null as number | null, [Validators.required]],
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

  constructor() {
    this.setupDynamicValidators();
    this.setupRetentionPreview();
    this.setupClassificationReset();
    this.loadRetentionRules();
    this.loadArchivalStructure();
    this.search();
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
      .get('retentionRuleId')
      ?.valueChanges.pipe(
        startWith(this.archivalForm.get('retentionRuleId')?.value),
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
          },
          { emitEvent: false },
        );
      });
  }

  async search(): Promise<void> {
    this.loading.set(true);
    this.selected.set(null);
    this.duplicateState.set('NOT_CHECKED');

    this.api
      .audit('SEARCH_PERFORMED', this.searchForm.getRawValue())
      .subscribe();

    this.api.searchCandidates(this.searchForm.getRawValue()).subscribe({
      next: (rows) => {
        this.candidates.set(rows);
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

    this.archivalForm.reset(
      {
        officialCode: doc.officialCode || '',
        documentType: doc.documentType || '',
        title: doc.title || '',
        documentFlow: (doc.documentFlow ||
          'PRODUCED_SENT') as FinalDocumentFlow,

        producingUnit: doc.producingUnit || '',
        keywords: Array.isArray(doc.keywords) ? doc.keywords.join(', ') : '',
        accessLevel:
          (doc.accessLevel as ConfidentialityLevel | null) || 'INTERNAL',
        procedureType: null,

        sizeBytes: doc.sizeBytes ?? null,
        format: doc.format || '',
        signers: this.signersText(doc),
        signedAt: this.signedAtText(doc),
        softwareVersion: doc.softwareVersion || '',

        serieId: null,
        subserieId: null,
        expedienteId: null,

        retentionRuleId: null,
        retentionStartDateISO: new Date().toISOString().slice(0, 10),
        retentionEndDateISO: '',

        recipientNameRole: '',
        recipientInstitution: '',
        dispatchEmails: '',

        senderNameRole: '',
        senderInstitution: '',
      },
      { emitEvent: true },
    );

    this.archivalForm.markAsUntouched();
    this.refreshRetentionEndDate();

    this.api
      .audit('CANDIDATE_SELECTED', {
        id: doc.id,
        officialCode: doc.officialCode,
      })
      .subscribe();
  }

  private loadRetentionRules(): void {
    this.api.getRetentionRules().subscribe({
      next: (rules) => this.retentionRules.set(rules),
      error: (err) => {
        if (err?.status === 401) {
          this.toasts.error('La sesión expiró. Inicie sesión nuevamente.');
          return;
        }

        this.toasts.error(
          err?.error?.message ||
            'No se pudieron cargar las reglas de retención.',
        );
      },
    });
  }

  private loadArchivalStructure(): void {
    this.api.getSeries().subscribe({
      next: (rows) => this.series.set(rows),
      error: () =>
        this.toasts.error('No se pudieron cargar las series archivísticas.'),
    });

    this.api.getSubseries().subscribe({
      next: (rows) => this.subseries.set(rows),
      error: () =>
        this.toasts.error('No se pudieron cargar las subseries archivísticas.'),
    });

    this.api.getExpedientes().subscribe({
      next: (rows) => this.expedientes.set(rows),
      error: () => this.toasts.error('No se pudieron cargar los expedientes.'),
    });
  }

  async verifyDuplicate(): Promise<void> {
    const code = String(
      this.archivalForm.getRawValue().officialCode || '',
    ).trim();

    if (!code) {
      this.toasts.error('El documento seleccionado no tiene código oficial.');
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

  filteredSubseries(): ArchivalSubseries[] {
    const serieId = Number(this.archivalForm.get('serieId')?.value || 0);
    if (!serieId) return [];

    return this.subseries().filter((item) => Number(item.serieId) === serieId);
  }

  filteredExpedientes(): ArchivalExpediente[] {
    const serieId = Number(this.archivalForm.get('serieId')?.value || 0);
    const subserieId = this.archivalForm.get('subserieId')?.value as
      | number
      | null;

    return this.expedientes().filter((item) => {
      if (serieId && Number(item.serieId) !== serieId) return false;
      if (subserieId != null) {
        return Number(item.subserieId ?? 0) === Number(subserieId);
      }
      return true;
    });
  }

  selectedSerie(): ArchivalSeries | null {
    const id = Number(this.archivalForm.get('serieId')?.value || 0);
    return this.series().find((item) => item.id === id) || null;
  }

  selectedSubserie(): ArchivalSubseries | null {
    const id = Number(this.archivalForm.get('subserieId')?.value || 0);
    if (!id) return null;
    return this.subseries().find((item) => item.id === id) || null;
  }

  selectedExpediente(): ArchivalExpediente | null {
    const id = Number(this.archivalForm.get('expedienteId')?.value || 0);
    return this.expedientes().find((item) => item.id === id) || null;
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
    return code.length >= 8;
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

  eligibility(): EligibilityState {
    return {
      pdfa: !!this.selected()?.isPDFA,
      signatures: !!this.selected()?.signaturesComplete,
      officialCodeComplete: this.hasCompleteOfficialCode(),
      requiredMetadata: this.hasRequiredArchivalMetadata(),
      classificationReady: this.isClassificationReady(),
      flowDataReady: this.hasRequiredFlowData(),
      duplicateChecked: this.duplicateState(),
    };
  }

  canSave(): boolean {
    const eligibility = this.eligibility();

    return (
      eligibility.pdfa &&
      eligibility.signatures &&
      eligibility.officialCodeComplete &&
      eligibility.requiredMetadata &&
      eligibility.classificationReady &&
      eligibility.flowDataReady &&
      eligibility.duplicateChecked === 'OK' &&
      this.archivalForm.valid
    );
  }

  formErrorSummary(): string | null {
    if (!this.archivalForm.touched) return null;

    const missing: string[] = [];

    if (!this.hasRequiredArchivalMetadata()) {
      if (!this.archivalForm.getRawValue().producingUnit?.trim()) {
        missing.push('Unidad productora');
      }
      if (!this.archivalForm.getRawValue().accessLevel) {
        missing.push('Nivel de acceso');
      }
    }

    if (!this.isClassificationReady()) {
      if (!this.selectedSerie()) missing.push('Serie');
      if (!this.selectedExpediente()) missing.push('Expediente');
    }

    if (!this.archivalForm.get('retentionRuleId')?.value) {
      missing.push('Regla de retención');
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
  }

  refreshRetentionEndDate(): void {
    const ruleId = Number(this.archivalForm.get('retentionRuleId')?.value || 0);
    const start = String(
      this.archivalForm.getRawValue().retentionStartDateISO || '',
    );
    const rule = this.retentionRules().find((item) => item.id === ruleId);

    if (!rule || !start) {
      this.archivalForm.patchValue(
        { retentionEndDateISO: '' },
        { emitEvent: false },
      );
      return;
    }

    const date = new Date(`${start}T00:00:00`);
    date.setFullYear(date.getFullYear() + Number(rule.years || 0));
    this.archivalForm.patchValue(
      { retentionEndDateISO: date.toISOString().slice(0, 10) },
      { emitEvent: false },
    );
  }

  retentionPreviewText(): string {
    const ruleId = Number(this.archivalForm.get('retentionRuleId')?.value || 0);
    const start = String(
      this.archivalForm.getRawValue().retentionStartDateISO || '',
    );
    const end = String(
      this.archivalForm.getRawValue().retentionEndDateISO || '',
    );
    const rule = this.retentionRules().find((item) => item.id === ruleId);

    if (!rule || !start) {
      return 'Seleccione una regla de retención para visualizar la vigencia.';
    }

    return `Inicio: ${start} · Duración: ${rule.years} año(s) · Fin estimado: ${end || '—'}`;
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
        'El documento seleccionado no tiene un código oficial completo.',
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

    if (accessLevel === 'HIGH' || accessLevel === 'RESTRICTED') {
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

    const keywords = csvToUniqueArray(String(raw.keywords || ''));
    const documentFlow = raw.documentFlow as FinalDocumentFlow;

    const payload: IntakePayload = {
      candidateId: doc.id,
      officialCode: String(raw.officialCode || '').trim(),
      metadata: {
        documentFlow,
        documentType: String(raw.documentType || '').trim(),
        title: String(raw.title || '').trim(),
        producingUnit: String(raw.producingUnit || '').trim(),
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
        ruleId: Number(raw.retentionRuleId),
        startDateISO: String(raw.retentionStartDateISO),
        trackingEnabled: true,
      },
      outgoing:
        documentFlow === 'PRODUCED_SENT'
          ? {
              recipientNameRole: String(raw.recipientNameRole || '').trim(),
              recipientInstitution: String(
                raw.recipientInstitution || '',
              ).trim(),
              dispatchEmails: csvToUniqueArray(
                String(raw.dispatchEmails || ''),
              ).map((item) => item.toLowerCase()),
            }
          : null,
      incoming:
        documentFlow === 'RECEIVED'
          ? {
              senderNameRole: String(raw.senderNameRole || '').trim() || null,
              senderInstitution:
                String(raw.senderInstitution || '').trim() || null,
            }
          : null,
    };

    this.loading.set(true);

    this.api.registerIntake(payload).subscribe({
      next: (response) => {
        this.loading.set(false);

        this.toasts.success(
          `Documento registrado en conservación (${response.intakeId}).`,
        );

        this.api.audit('INTAKE_SUCCESS', response).subscribe();

        this.selected.set(null);
        this.duplicateState.set('NOT_CHECKED');

        this.archivalForm.reset(
          {
            documentFlow: 'PRODUCED_SENT',
            accessLevel: 'INTERNAL',
            procedureType: null,
            retentionRuleId: null,
            retentionStartDateISO: new Date().toISOString().slice(0, 10),
            retentionEndDateISO: '',
            serieId: null,
            subserieId: null,
            expedienteId: null,
          } as any,
          { emitEvent: true },
        );

        this.search();
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

  fieldErr(name: string): string | null {
    const control = this.archivalForm.get(name);
    if (!control || !control.touched || !control.errors) return null;

    if (control.errors['required']) return 'Obligatorio.';
    if (control.errors['requiredTrue']) return 'Debe activar el seguimiento.';
    if (control.errors['minlength']) return 'Muy corto.';
    if (control.errors['emails'])
      return 'Ingrese correos válidos separados por coma.';
    return 'Valor inválido.';
  }
}
