import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ConfirmService } from '../../../shared/ui/confirm.service';
import { ToastService } from '../../../shared/ui/toast.service';

import { ConservationIntakeService } from '../../../../core/services/conservation-intake.service';
import {
  AccessRule,
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

  // -----------------------------
  // UI State
  // -----------------------------
  readonly loading = signal(false);
  readonly candidates = signal<CandidateDoc[]>([]);
  readonly selected = signal<CandidateDoc | null>(null);

  readonly retentionRules = signal<RetentionRule[]>([]);
  readonly duplicateState =
    signal<EligibilityState['duplicateChecked']>('NOT_CHECKED');

  // Classification (institutional chart placeholder)
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

  // Access rules (UI-only; integration-ready)
  readonly accessRules = signal<AccessRule[]>([]);

  // -----------------------------
  // Forms
  // -----------------------------
  /** Search filters (UI) */
  readonly searchForm = this.fb.group({
    q: [''],
    officialCode: [''],
    producingUnit: [''],
    dateFrom: [''],
    dateTo: [''],
    signatureState: ['ALL'], // ALL | COMPLETE | INCOMPLETE
    pdfaOnly: [true],
    classification: [''],
  });

  /** Main archival intake form (strict required fields) */
  readonly archivalForm = this.fb.group({
    officialCode: [{ value: '', disabled: true }, [Validators.required]],
    title: ['', [Validators.required, Validators.minLength(3)]],
    producingUnit: ['', [Validators.required]],
    author: ['', [Validators.required]],
    keywords: ['', [Validators.required]], // comma-separated UI
    accessLevel: ['INTERNAL' as ConfidentialityLevel, [Validators.required]],
    trackingEnabled: [true, [Validators.requiredTrue]],

    retentionRuleId: [null as any, [Validators.required]],
    retentionStartDateISO: [
      { value: '', disabled: true },
      [Validators.required],
    ],
  });

  // -----------------------------
  // Derived state (eligibility + UX helpers)
  // -----------------------------
  /** Core eligibility checks required by HU-019 */
  readonly eligibility = computed<EligibilityState>(() => {
    const doc = this.selected();
    const requiredMetaOk = this.hasRequiredArchivalMetadata();
    const officialOk =
      !!doc?.officialCode && doc.officialCode.trim().length >= 8;

    return {
      pdfa: !!doc?.isPDFA,
      signatures: !!doc?.signaturesComplete,
      officialCodeComplete: officialOk,
      requiredMetadata: requiredMetaOk,
      duplicateChecked: this.duplicateState(),
    };
  });

  /** True only when every rule is satisfied and UI is ready to save */
  readonly canSave = computed(() => {
    const e = this.eligibility();
    const formOk = this.archivalForm.valid;
    const classificationOk = !!this.classificationSelected();
    const duplicateOk = e.duplicateChecked === 'OK';

    return (
      e.pdfa &&
      e.signatures &&
      e.officialCodeComplete &&
      e.requiredMetadata &&
      formOk &&
      classificationOk &&
      duplicateOk
    );
  });

  /** Optional: compact validation summary shown above the form */
  readonly formErrorSummary = computed<string | null>(() => {
    // Only show after user touched something to avoid "red wall" on first open
    if (!this.archivalForm.touched) return null;
    if (this.archivalForm.valid) return null;

    const missing: string[] = [];
    const requiredFields: Array<[string, string]> = [
      ['title', 'Título'],
      ['producingUnit', 'Unidad productora'],
      ['author', 'Autor/Productor'],
      ['keywords', 'Palabras clave'],
      ['retentionRuleId', 'Plazo de retención'],
      ['trackingEnabled', 'Seguimiento de vigencia'],
    ];

    for (const [key, label] of requiredFields) {
      const c = this.archivalForm.get(key);
      if (c?.errors?.['required'] || c?.errors?.['requiredTrue'])
        missing.push(label);
    }

    if (!missing.length) return 'Revise los campos marcados como obligatorios.';
    return `Campos obligatorios pendientes: ${missing.join(', ')}.`;
  });

  constructor() {
    this.loadRetentionRules();
    this.search(); // initial load
  }

  // -----------------------------
  // Search + Selection
  // -----------------------------
  async search(): Promise<void> {
    this.loading.set(true);

    // Reset selection & duplicate state on each new search
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
      error: () => {
        this.loading.set(false);
        this.toasts.error('Error al buscar candidatos.');
      },
    });
  }

  /** Select a candidate and prefill the intake form */
  selectDoc(d: CandidateDoc): void {
    this.selected.set(d);
    this.duplicateState.set('NOT_CHECKED');
    this.classificationSelected.set(null);
    this.accessRules.set([]);

    // Prefill fields (some are read-only)
    this.archivalForm.patchValue({
      officialCode: d.officialCode || '',
      title: d.title || '',
      producingUnit: d.producingUnit || '',
      retentionStartDateISO: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    });

    // Mark untouched to keep UX clean (no immediate validation banner)
    this.archivalForm.markAsUntouched();
    this.archivalForm.updateValueAndValidity();

    this.api
      .audit('CANDIDATE_SELECTED', { id: d.id, officialCode: d.officialCode })
      .subscribe();
  }

  // -----------------------------
  // Eligibility helpers
  // -----------------------------
  /** Minimal metadata completeness check (UI rule) */
  private hasRequiredArchivalMetadata(): boolean {
    const fg = this.archivalForm;
    return (
      !!fg.get('title')?.value &&
      !!fg.get('producingUnit')?.value &&
      !!fg.get('author')?.value &&
      !!fg.get('keywords')?.value
    );
  }

  // -----------------------------
  // Duplicate check (integration-ready)
  // -----------------------------
  async verifyDuplicate(): Promise<void> {
    const doc = this.selected();

    if (!doc?.officialCode?.trim()) {
      this.toasts.error('El documento no tiene identificador oficial.');
      return;
    }

    this.duplicateState.set('PENDING');
    this.api
      .audit('DUPLICATE_CHECK_REQUESTED', { code: doc.officialCode })
      .subscribe();

    this.api.checkDuplicateOfficialCode(doc.officialCode).subscribe({
      next: async (r) => {
        if (r.status === 'DUPLICATE') {
          this.duplicateState.set('DUPLICATE');
          this.api.audit('DUPLICATE_CHECK_RESULT_DUPLICATE', r).subscribe();

          await this.confirm.ask(
            `Conflicto: el código ya existe (ID ${r.existingId}). No se puede ingresar a conservación.`,
            'Código duplicado',
          );
          return;
        }

        this.duplicateState.set('OK');
        this.api.audit('DUPLICATE_CHECK_RESULT_OK').subscribe();
        this.toasts.success('Código verificado: no hay duplicidad.');
      },
      error: () => {
        this.duplicateState.set('NOT_CHECKED');
        this.api.audit('DUPLICATE_CHECK_ERROR').subscribe();
        this.toasts.error('No fue posible verificar duplicidad.');
      },
    });
  }

  // -----------------------------
  // Classification (UI)
  // -----------------------------
  pickClassification(opt: { code: string; label: string }): void {
    this.classificationSelected.set(opt);
  }

  classificationFiltered(): Array<{ code: string; label: string }> {
    const q = (this.classificationQuery() || '').trim().toLowerCase();
    if (!q) return this.classificationOptions();
    return this.classificationOptions().filter(
      (o) =>
        o.code.toLowerCase().includes(q) || o.label.toLowerCase().includes(q),
    );
  }

  // -----------------------------
  // Access rules (UI-only)
  // -----------------------------
  addAccessRule(kind: 'USER' | 'ROLE'): void {
    // Placeholder for a future picker modal (users/roles).
    const id = Math.floor(Math.random() * 1000) + 1;
    const label = kind === 'USER' ? `Usuario #${id}` : `Rol #${id}`;

    const rule: AccessRule = {
      kind,
      subjectId: id,
      subjectLabel: label,
      actions: ['VIEW'],
    };

    this.accessRules.update((arr) => [rule, ...arr]);
    this.toasts.info('Regla agregada (UI).');
  }

  toggleAction(rule: AccessRule, action: 'VIEW' | 'EDIT' | 'SIGN'): void {
    this.accessRules.update((arr) =>
      arr.map((r) => {
        if (r !== rule) return r;

        const set = new Set(r.actions);
        if (set.has(action)) set.delete(action);
        else set.add(action);

        // UX guard: never allow empty actions; keep at least VIEW
        if (set.size === 0) set.add('VIEW');

        return { ...r, actions: Array.from(set) as any };
      }),
    );
  }

  removeRule(rule: AccessRule): void {
    this.accessRules.update((arr) => arr.filter((r) => r !== rule));
  }

  // -----------------------------
  // Retention + Preview (UI)
  // -----------------------------
  private loadRetentionRules(): void {
    this.api.getRetentionRules().subscribe({
      next: (r) => this.retentionRules.set(r),
      error: () =>
        this.toasts.error('No se pudieron cargar plazos de retención.'),
    });
  }

  retentionPreviewText(): string {
    const ruleId = Number(this.archivalForm.get('retentionRuleId')?.value);
    const start = String(
      this.archivalForm.get('retentionStartDateISO')?.value || '',
    );
    const rule = this.retentionRules().find((r) => r.id === ruleId);

    if (!rule || !start) return 'Seleccione un plazo para ver la vigencia.';

    const dt = new Date(start);
    dt.setFullYear(dt.getFullYear() + rule.years);
    const endISO = dt.toISOString().slice(0, 10);

    return `Inicio: ${start} · Duración: ${rule.years} año(s) · Fin estimado: ${endISO}`;
  }

  // -----------------------------
  // Save (UI workflow + hooks)
  // -----------------------------
  async save(): Promise<void> {
    const doc = this.selected();
    if (!doc) return;

    // Show validation messages
    this.archivalForm.markAllAsTouched();

    if (!this.archivalForm.valid) {
      this.toasts.error('Revise los campos obligatorios.');
      return;
    }

    if (!this.classificationSelected()) {
      this.toasts.error(
        'Debe seleccionar una clasificación del cuadro institucional.',
      );
      return;
    }

    // Enforce eligibility rules
    const e = this.eligibility();
    if (
      !e.pdfa ||
      !e.signatures ||
      !e.officialCodeComplete ||
      !e.requiredMetadata
    ) {
      this.toasts.error(
        'El documento no cumple los requisitos para ingresar a conservación.',
      );
      return;
    }

    if (e.duplicateChecked !== 'OK') {
      this.toasts.error(
        'Debe verificar duplicidad del código antes de guardar.',
      );
      return;
    }

    const level = this.archivalForm.get('accessLevel')
      ?.value as ConfidentialityLevel;

    // Extra confirm when handling sensitive levels
    if (level === 'HIGH' || level === 'RESTRICTED') {
      const okWarn = await this.confirm.ask(
        'Nivel sensible seleccionado. Verifique reglas de acceso antes de confirmar.',
        'Advertencia',
      );
      if (!okWarn) return;
    }

    const ok = await this.confirm.ask(
      '¿Confirmar ingreso del documento a conservación? Se iniciará el seguimiento de vigencia.',
      'Confirmar ingreso',
    );
    if (!ok) {
      this.api.audit('INTAKE_CANCELLED', { id: doc.id }).subscribe();
      return;
    }

    // Normalize keywords
    const raw = this.archivalForm.getRawValue();
    const keywords = String(raw.keywords || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);

    // Build payload for integration (currently mocked by the service)
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
      classification: this.classificationSelected()!,
      accessRules: this.accessRules(),
      retention: {
        ruleId: Number(raw.retentionRuleId),
        startDateISO: String(raw.retentionStartDateISO),
        trackingEnabled: !!raw.trackingEnabled,
      },
    };

    this.api.audit('INTAKE_CONFIRMED', payload).subscribe();

    this.loading.set(true);
    this.api.registerIntake(payload as any).subscribe({
      next: (r) => {
        this.loading.set(false);
        this.toasts.success(
          `Documento ingresado a conservación. (${r.intakeId})`,
        );
        this.api.audit('INTAKE_SUCCESS', r).subscribe();

        // Reset UI state
        this.selected.set(null);
        this.duplicateState.set('NOT_CHECKED');
        this.classificationSelected.set(null);
        this.accessRules.set([]);

        this.archivalForm.reset({
          accessLevel: 'INTERNAL',
          trackingEnabled: true,
          retentionRuleId: null,
          retentionStartDateISO: new Date().toISOString().slice(0, 10),
        } as any);
      },
      error: () => {
        this.loading.set(false);
        this.toasts.error('Error al registrar ingreso a conservación.');
        this.api.audit('INTAKE_ERROR').subscribe();
      },
    });
  }

  // -----------------------------
  // Form error helper
  // -----------------------------
  fieldErr(name: string): string | null {
    const c = this.archivalForm.get(name);
    if (!c || !c.touched || !c.errors) return null;
    if (c.errors['required']) return 'Obligatorio.';
    if (c.errors['requiredTrue']) return 'Debe activar el seguimiento.';
    if (c.errors['minlength']) return 'Muy corto.';
    return 'Valor inválido.';
  }
}
