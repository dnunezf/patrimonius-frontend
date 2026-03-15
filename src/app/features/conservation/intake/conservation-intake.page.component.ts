import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ConfirmService } from '../../../shared/ui/confirm.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { ConservationIntakeService } from '../../../../core/services/conservation-intake.service';

import {
  CandidateDoc,
  ConfidentialityLevel,
  EligibilityState,
  RetentionRule,
} from './models';

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

  readonly loading = signal(false);
  readonly candidates = signal<CandidateDoc[]>([]);
  readonly selected = signal<CandidateDoc | null>(null);
  readonly retentionRules = signal<RetentionRule[]>([]);
  readonly duplicateState =
    signal<EligibilityState['duplicateChecked']>('NOT_CHECKED');

  readonly classificationQuery = signal('');
  readonly classificationSelected = signal<{
    code: string;
    label: string;
  } | null>(null);

  readonly classificationOptions = signal<
    Array<{ code: string; label: string }>
  >([
    { code: '1.1.01', label: 'Serie 1 — Actas' },
    { code: '1.1.02', label: 'Serie 1 — Informes' },
    { code: '2.3.10', label: 'Serie 2 — Correspondencia' },
  ]);

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
    title: ['', [Validators.required, Validators.minLength(3)]],
    producingUnit: ['', [Validators.required]],
    author: [{ value: '', disabled: true }, [Validators.required]],
    keywords: ['', [Validators.required]],
    accessLevel: ['INTERNAL' as ConfidentialityLevel, [Validators.required]],
    trackingEnabled: [true, [Validators.requiredTrue]],
    retentionRuleId: [null as number | null, [Validators.required]],
    retentionStartDateISO: [
      { value: '', disabled: true },
      [Validators.required],
    ],
  });

  readonly eligibility = computed<EligibilityState>(() => {
    const doc = this.selected();
    const officialOk =
      !!doc?.officialCode && doc.officialCode.trim().length >= 8;

    return {
      pdfa: !!doc?.isPDFA,
      signatures: !!doc?.signaturesComplete,
      officialCodeComplete: officialOk,
      requiredMetadata: this.hasRequiredArchivalMetadata(),
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
      this.archivalForm.valid &&
      !!this.classificationSelected() &&
      eligibility.duplicateChecked === 'OK'
    );
  });

  readonly formErrorSummary = computed<string | null>(() => {
    if (!this.archivalForm.touched) return null;
    if (this.archivalForm.valid) return null;

    const missing: string[] = [];
    const requiredFields: Array<[string, string]> = [
      ['title', 'Título'],
      ['producingUnit', 'Unidad productora'],
      ['keywords', 'Palabras clave'],
      ['retentionRuleId', 'Regla de retención'],
      ['trackingEnabled', 'Seguimiento'],
    ];

    for (const [key, label] of requiredFields) {
      const control = this.archivalForm.get(key);
      if (control?.errors?.['required'] || control?.errors?.['requiredTrue']) {
        missing.push(label);
      }
    }

    return missing.length
      ? `Campos obligatorios pendientes: ${missing.join(', ')}.`
      : 'Revise los campos obligatorios.';
  });

  constructor() {
    this.loadRetentionRules();
    this.search();
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
    this.classificationSelected.set(null);

    this.archivalForm.patchValue({
      officialCode: doc.officialCode || '',
      title: doc.title || '',
      producingUnit: doc.producingUnit || '',
      author: doc.author || '',
      keywords: Array.isArray(doc.keywords) ? doc.keywords.join(', ') : '',
      retentionStartDateISO: new Date().toISOString().slice(0, 10),
      accessLevel: 'INTERNAL',
      trackingEnabled: true,
      retentionRuleId: null,
    });

    this.archivalForm.markAsUntouched();
    this.archivalForm.updateValueAndValidity();

    this.api
      .audit('CANDIDATE_SELECTED', {
        id: doc.id,
        officialCode: doc.officialCode,
      })
      .subscribe();
  }

  private hasRequiredArchivalMetadata(): boolean {
    const form = this.archivalForm;
    return (
      !!form.get('title')?.value &&
      !!form.get('producingUnit')?.value &&
      !!form.get('author')?.value &&
      !!form.get('keywords')?.value
    );
  }

  async verifyDuplicate(): Promise<void> {
    const doc = this.selected();

    if (!doc?.officialCode?.trim()) {
      this.toasts.error('El documento seleccionado no tiene código oficial.');
      return;
    }

    this.duplicateState.set('PENDING');

    this.api
      .audit('DUPLICATE_CHECK_REQUESTED', {
        code: doc.officialCode,
      })
      .subscribe();

    this.api.checkDuplicateOfficialCode(doc.officialCode).subscribe({
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

  pickClassification(opt: { code: string; label: string }): void {
    this.classificationSelected.set(opt);
  }

  classificationFiltered(): Array<{ code: string; label: string }> {
    const q = (this.classificationQuery() || '').trim().toLowerCase();
    if (!q) return this.classificationOptions();

    return this.classificationOptions().filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q),
    );
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

  retentionPreviewText(): string {
    const ruleId = Number(this.archivalForm.get('retentionRuleId')?.value);
    const start = String(
      this.archivalForm.get('retentionStartDateISO')?.value || '',
    );
    const rule = this.retentionRules().find((item) => item.id === ruleId);

    if (!rule || !start) {
      return 'Seleccione una regla de retención para visualizar la vigencia.';
    }

    const date = new Date(start);
    date.setFullYear(date.getFullYear() + rule.years);
    const endISO = date.toISOString().slice(0, 10);

    return `Inicio: ${start} · Duración: ${rule.years} año(s) · Fin estimado: ${endISO}`;
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

    const classification = this.classificationSelected();
    if (!classification) {
      this.toasts.error('Debe seleccionar una clasificación institucional.');
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
        'Los metadatos archivísticos requeridos están incompletos.',
      );
      return;
    }

    if (eligibility.duplicateChecked !== 'OK') {
      this.toasts.error(
        'Debe verificar la duplicidad del código antes de guardar.',
      );
      return;
    }

    const accessLevel = this.archivalForm.get('accessLevel')
      ?.value as ConfidentialityLevel;

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

    const raw = this.archivalForm.getRawValue();
    const keywords = String(raw.keywords || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .filter((value, index, arr) => arr.indexOf(value) === index);

    const payload = {
      candidateId: doc.id,
      officialCode: doc.officialCode.trim(),
      metadata: {
        title: String(raw.title).trim(),
        producingUnit: String(raw.producingUnit).trim(),
        author: String(raw.author || doc.author || '').trim(),
        keywords,
        accessLevel,
      },
      classification,
      retention: {
        ruleId: Number(raw.retentionRuleId),
        startDateISO: String(raw.retentionStartDateISO),
        trackingEnabled: !!raw.trackingEnabled,
      },
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
        this.classificationSelected.set(null);

        this.archivalForm.reset({
          accessLevel: 'INTERNAL',
          trackingEnabled: true,
          retentionRuleId: null,
          retentionStartDateISO: new Date().toISOString().slice(0, 10),
        } as any);

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
    return 'Valor inválido.';
  }
}
