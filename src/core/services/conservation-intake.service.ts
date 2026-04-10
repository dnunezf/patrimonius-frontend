import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, EMPTY, map } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  ArchivalExpediente,
  ArchivalSeries,
  ArchivalSubseries,
  CandidateDoc,
  IntakePayload,
  RetentionRule,
} from '../../app/features/conservation/intake/models';
import { environment } from '../../environments/environment';

type DuplicateCheckResult =
  | { status: 'OK' }
  | { status: 'DUPLICATE'; existingId: number };

export type ReferenceCodePreview = {
  referenceCode: string;
  typeCode: string;
  unitCode: string;
  sequence: number;
  year: number;
};

function extractArray<T = any>(raw: any): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (Array.isArray(raw?.items)) return raw.items as T[];
  if (Array.isArray(raw?.rows)) return raw.rows as T[];
  if (Array.isArray(raw?.data)) return raw.data as T[];
  return [];
}

@Injectable({ providedIn: 'root' })
export class ConservationIntakeService {
  private readonly apiRoot = environment.apiUrl;
  private readonly base = `${environment.apiUrl}/admin/conservation`;

  constructor(private readonly http: HttpClient) {}

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

  /**
   * Returns the final reference-code preview that will replace the temporary
   * TMP... code when the document is sent to conservation.
   */
  previewReferenceCode(payload: {
    candidateId: number;
    documentType?: string | null;
    producingUnit?: string | null;
  }): Observable<ReferenceCodePreview> {
    let params = new HttpParams().set(
      'candidateId',
      String(payload.candidateId),
    );

    if (payload.documentType) {
      params = params.set('documentType', String(payload.documentType));
    }

    if (payload.producingUnit) {
      params = params.set('producingUnit', String(payload.producingUnit));
    }

    return this.http.get<ReferenceCodePreview>(
      `${this.base}/reference-code-preview`,
      { params },
    );
  }

  getRetentionRules(): Observable<RetentionRule[]> {
    return this.http.get<RetentionRule[]>(`${this.base}/retention-rules`);
  }

  registerIntake(
    payload: IntakePayload,
  ): Observable<{
    intakeId: string;
    id: number;
    message: string;
    officialCode?: string;
  }> {
    return this.http.post<{
      intakeId: string;
      id: number;
      message: string;
      officialCode?: string;
    }>(`${this.base}/intakes`, payload);
  }

  getSeries(): Observable<ArchivalSeries[]> {
    return this.http.get<any>(`${this.apiRoot}/api/admin/series`).pipe(
      map((raw) =>
        extractArray(raw).map((item: any) => ({
          id: Number(item.id),
          code: String(item.codigo ?? item.code ?? ''),
          name: String(item.nombre ?? item.name ?? ''),
          unitId:
            item.unidad_id != null
              ? Number(item.unidad_id)
              : item.unitId != null
                ? Number(item.unitId)
                : null,
        })),
      ),
    );
  }

  getSubseries(): Observable<ArchivalSubseries[]> {
    return this.http.get<any>(`${this.apiRoot}/api/admin/subseries`).pipe(
      map((raw) =>
        extractArray(raw).map((item: any) => ({
          id: Number(item.id),
          code: String(item.codigo ?? item.code ?? ''),
          name: String(item.nombre ?? item.name ?? ''),
          serieId: Number(item.serie_id ?? item.serieId ?? 0),
        })),
      ),
    );
  }

  getExpedientes(): Observable<ArchivalExpediente[]> {
    return this.http.get<any>(`${this.apiRoot}/api/admin/expedientes`).pipe(
      map((raw) =>
        extractArray(raw).map((item: any) => ({
          id: Number(item.id),
          code: String(item.codigo ?? item.code ?? ''),
          name: String(item.nombre ?? item.name ?? ''),
          serieId: Number(item.serie_id ?? item.serieId ?? 0),
          subserieId:
            item.subserie_id != null
              ? Number(item.subserie_id)
              : item.subserieId != null
                ? Number(item.subserieId)
                : null,
          unitId:
            item.unidad_id != null
              ? Number(item.unidad_id)
              : item.unitId != null
                ? Number(item.unitId)
                : null,
        })),
      ),
    );
  }

  /**
   * Fire-and-forget audit.
   * Audit errors must never block the main conservation flow.
   */
  audit(event: string, detail?: any): Observable<{ ok: true } | null> {
    return this.http
      .post<{ ok: true }>(`${this.base}/audit`, { event, detail })
      .pipe(catchError(() => EMPTY));
  }
}
