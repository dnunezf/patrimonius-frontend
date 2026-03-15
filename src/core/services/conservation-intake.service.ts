import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  CandidateDoc,
  IntakePayload,
  RetentionRule,
} from '../../app/features/conservation/intake/models';
import { environment } from '../../environments/environment';

type DuplicateCheckResult =
  | { status: 'OK' }
  | { status: 'DUPLICATE'; existingId: number };

@Injectable({ providedIn: 'root' })
export class ConservationIntakeService {
  private readonly base = `${environment.apiUrl}/admin/conservation`;

  constructor(private http: HttpClient) {}

  searchCandidates(filters: Record<string, any>): Observable<CandidateDoc[]> {
    let params = new HttpParams();

    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      params = params.set(key, String(value));
    });

    return this.http.get<CandidateDoc[]>(`${this.base}/candidates`, { params });
  }

  checkDuplicateOfficialCode(code: string): Observable<DuplicateCheckResult> {
    const params = new HttpParams().set('code', code);
    return this.http.get<DuplicateCheckResult>(`${this.base}/duplicate-check`, {
      params,
    });
  }

  getRetentionRules(): Observable<RetentionRule[]> {
    return this.http.get<RetentionRule[]>(`${this.base}/retention-rules`);
  }

  registerIntake(
    payload: IntakePayload,
  ): Observable<{ intakeId: string; id: number; message: string }> {
    return this.http.post<{ intakeId: string; id: number; message: string }>(
      `${this.base}/intakes`,
      payload,
    );
  }

  /**
   * Fire-and-forget UI audit.
   * Audit errors must never block the main functional flow.
   */
  audit(event: string, detail?: any): Observable<{ ok: true } | null> {
    return this.http
      .post<{ ok: true }>(`${this.base}/audit`, { event, detail })
      .pipe(catchError(() => EMPTY));
  }
}
