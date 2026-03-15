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
    pdfaOnly: [true],
  });

  readonly archivalForm = this.fb.group({
    officialCode: [{ value: '', disabled: true }, [Validators.required]],
    title: ['', [Validators.required, Validators.minLength(3)]],
    producingUnit: ['', [Validators.required]],
    author: ['', [Validators.required]],
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
    const e = this.eligibility();
    return (
      e.pdfa &&
      e.signatures &&
      e.officialCodeComplete &&
      e.requiredMetadata &&
      this.archivalForm.valid &&
      !!this.classificationSelected() &&
      e.duplicateChecked === 'OK'
    );
  });

  readonly formErrorSummary = computed<string | null>(() => {
    if (!this.archivalForm.touched) return null;
    if (this.archivalForm.valid) return null;

    const missing: string[] = [];
    const requiredFields: Array<[string, string]> = [
      ['title', 'Title'],
      ['producingUnit', 'Producing unit'],
      ['author', 'Author'],
      ['keywords', 'Keywords'],
      ['retentionRuleId', 'Retention rule'],
      ['trackingEnabled', 'Tracking'],
    ];

    for (const [key, label] of requiredFields) {
      const c = this.archivalForm.get(key);
      if (c?.errors?.['required'] || c?.errors?.['requiredTrue']) {
        missing.push(label);
      }
    }

    return missing.length
      ? `Required fields pending: ${missing.join(', ')}.`
      : 'Please review the required fields.';
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
          this.toasts.error('Session expired. Please sign in again.');
          return;
        }

        if (err?.status === 403) {
          this.toasts.error(
            'You do not have permission to access conservation.',
          );
          return;
        }

        this.toasts.error(
          err?.error?.message || 'Could not load conservation candidates.',
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
      author: '',
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
    const fg = this.archivalForm;
    return (
      !!fg.get('title')?.value &&
      !!fg.get('producingUnit')?.value &&
      !!fg.get('author')?.value &&
      !!fg.get('keywords')?.value
    );
  }

  async verifyDuplicate(): Promise<void> {
    const doc = this.selected();

    if (!doc?.officialCode?.trim()) {
      this.toasts.error(
        'The selected document does not have an official code.',
      );
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
            `Duplicate code detected. Existing document ID: ${result.existingId}.`,
            'Duplicate code',
          );
          return;
        }

        this.duplicateState.set('OK');
        this.toasts.success('Official code verified successfully.');
      },
      error: (err) => {
        this.duplicateState.set('NOT_CHECKED');
        this.toasts.error(
          err?.error?.message || 'Could not verify duplicate code.',
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
          this.toasts.error('Session expired. Please sign in again.');
          return;
        }

        this.toasts.error(
          err?.error?.message || 'Could not load retention rules.',
        );
      },
    });
  }

  retentionPreviewText(): string {
    const ruleId = Number(this.archivalForm.get('retentionRuleId')?.value);
    const start = String(
      this.archivalForm.get('retentionStartDateISO')?.value || '',
    );
    const rule = this.retentionRules().find((r) => r.id === ruleId);

    if (!rule || !start) {
      return 'Select a retention rule to preview the validity period.';
    }

    const dt = new Date(start);
    dt.setFullYear(dt.getFullYear() + rule.years);
    const endISO = dt.toISOString().slice(0, 10);

    return `Start: ${start} · Duration: ${rule.years} year(s) · Estimated end: ${endISO}`;
  }

  async save(): Promise<void> {
    const doc = this.selected();
    if (!doc) {
      this.toasts.error('Please select a document first.');
      return;
    }

    this.archivalForm.markAllAsTouched();

    if (!this.archivalForm.valid) {
      this.toasts.error('Please complete the required fields.');
      return;
    }

    const classification = this.classificationSelected();
    if (!classification) {
      this.toasts.error('You must select an institutional classification.');
      return;
    }

    const eligibility = this.eligibility();

    if (!eligibility.pdfa) {
      this.toasts.error(
        'The selected document is not eligible for PDF/A intake.',
      );
      return;
    }

    if (!eligibility.signatures) {
      this.toasts.error(
        'The selected document does not meet the signature requirement.',
      );
      return;
    }

    if (!eligibility.officialCodeComplete) {
      this.toasts.error(
        'The selected document does not have a complete official code.',
      );
      return;
    }

    if (!eligibility.requiredMetadata) {
      this.toasts.error('Required archival metadata is incomplete.');
      return;
    }

    if (eligibility.duplicateChecked !== 'OK') {
      this.toasts.error('You must verify duplicate code before saving.');
      return;
    }

    const level = this.archivalForm.get('accessLevel')
      ?.value as ConfidentialityLevel;

    if (level === 'HIGH' || level === 'RESTRICTED') {
      const accepted = await this.confirm.ask(
        'Sensitive access level selected. Do you want to continue?',
        'Warning',
      );
      if (!accepted) return;
    }

    const confirmed = await this.confirm.ask(
      'Confirm document intake into conservation?',
      'Confirm intake',
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
        author: String(raw.author).trim(),
        keywords,
        accessLevel: level,
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
          `Document registered in conservation (${response.intakeId}).`,
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
          this.toasts.error('Session expired. Please sign in again.');
          return;
        }

        if (err?.status === 403) {
          this.toasts.error(
            'You do not have permission to register conservation intake.',
          );
          return;
        }

        if (
          err?.status === 409 &&
          err?.error?.error === 'duplicate_official_code'
        ) {
          this.duplicateState.set('DUPLICATE');
          this.toasts.error('Duplicate official code detected.');
          return;
        }

        if (
          err?.status === 409 &&
          err?.error?.error === 'duplicate_conservation_document'
        ) {
          this.toasts.error(
            'This document is already registered in conservation.',
          );
          return;
        }

        if (err?.status === 422) {
          this.toasts.error('Validation failed. Please review the form.');
          return;
        }

        this.toasts.error(
          err?.error?.message || 'Could not register conservation intake.',
        );
      },
    });
  }

  fieldErr(name: string): string | null {
    const control = this.archivalForm.get(name);
    if (!control || !control.touched || !control.errors) return null;

    if (control.errors['required']) return 'Required.';
    if (control.errors['requiredTrue']) return 'Tracking must be enabled.';
    if (control.errors['minlength']) return 'Too short.';
    return 'Invalid value.';
  }
}
