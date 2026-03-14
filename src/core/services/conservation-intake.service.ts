import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { CandidateDoc, IntakePayload, RetentionRule } from '../../app/features/conservation/intake/models';

type DuplicateCheckResult =
  | { status: 'OK' }
  | { status: 'DUPLICATE'; existingId: number };

@Injectable({ providedIn: 'root' })
export class ConservationIntakeService {
  searchCandidates(filters: Record<string, any>): Observable<CandidateDoc[]> {
    void filters;

    const data: CandidateDoc[] = [
      {
        id: 101,
        officialCode: 'MNCR-DAF-2026-000123',
        title: 'Acta de Consejo - Enero',
        producingUnit: 'Dirección Administrativa Financiera',
        createdAtISO: new Date().toISOString(),
        isPDFA: true,
        signaturesComplete: true,
        keywords: ['acta', 'consejo'],
      },
      {
        id: 102,
        officialCode: 'MNCR-DAF-2026-000124',
        title: 'Informe mensual - Área X',
        producingUnit: 'Área X',
        createdAtISO: new Date().toISOString(),
        isPDFA: true,
        signaturesComplete: false,
        keywords: ['informe'],
      },
      {
        id: 103,
        officialCode: '',
        title: 'Documento sin código oficial',
        producingUnit: 'Unidad Y',
        createdAtISO: new Date().toISOString(),
        isPDFA: false,
        signaturesComplete: true,
      },
    ];

    return of(data).pipe(delay(220));
  }

  checkDuplicateOfficialCode(code: string): Observable<DuplicateCheckResult> {
    const normalized = (code || '').trim();
    if (!normalized)
      return throwError(() => new Error('Missing official code'));

    if (normalized.endsWith('000123')) {
      const res: DuplicateCheckResult = {
        status: 'DUPLICATE',
        existingId: 777,
      };
      return of(res).pipe(delay(250));
    }

    const res: DuplicateCheckResult = { status: 'OK' };
    return of(res).pipe(delay(250));
  }

  getRetentionRules(): Observable<RetentionRule[]> {
    const rules: RetentionRule[] = [
      { id: 1, label: 'Serie A — 10 años', years: 10 },
      { id: 2, label: 'Serie B — 5 años', years: 5 },
      { id: 3, label: 'Serie C — 2 años', years: 2 },
    ];
    return of(rules).pipe(delay(120));
  }

  registerIntake(payload: IntakePayload): Observable<{ intakeId: string }> {
    void payload;
    // MOCK success
    return of({
      intakeId: `INTAKE-${Math.floor(Math.random() * 100000)}`,
    }).pipe(delay(450));
  }

  audit(event: string, detail?: any): Observable<void> {
    void event;
    void detail;
    return of(void 0);
  }
}
