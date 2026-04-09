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

function extractArray<T = any>(raw: any, extraKeys: string[] = []): T[] {
  if (Array.isArray(raw)) return raw as T[];

  const keys = [
    'items',
    'rows',
    'data',
    'results',
    'series',
    'subseries',
    'subSeries',
    'expedientes',
    ...extraKeys,
  ];

  for (const key of keys) {
    if (Array.isArray(raw?.[key])) {
      return raw[key] as T[];
    }
  }

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

  getRetentionRules(): Observable<RetentionRule[]> {
    return this.http.get<RetentionRule[]>(`${this.base}/retention-rules`);
  }

  registerIntake(
    payload: IntakePayload,
  ): Observable<{
    intakeId: string;
    id: number;
    officialCode?: string;
    message: string;
  }> {
    return this.http.post<{
      intakeId: string;
      id: number;
      officialCode?: string;
      message: string;
    }>(`${this.base}/intakes`, payload);
  }

  /**
   * Loads archival series from the existing admin catalog module.
   */
  getSeries(): Observable<ArchivalSeries[]> {
    return this.http.get<any>(`${this.apiRoot}/api/admin/series`).pipe(
      map((raw) =>
        extractArray(raw, ['series']).map((item: any) => ({
          id: Number(item.id),
          code: String(item.codigo ?? item.code ?? ''),
          name: String(item.nombre ?? item.name ?? ''),
          unitId:
            item.unidad_id != null
              ? Number(item.unidad_id)
              : item.unitId != null
                ? Number(item.unitId)
                : item.unidad?.id != null
                  ? Number(item.unidad.id)
                  : null,
        })),
      ),
    );
  }

  /**
   * Loads archival subseries from the existing admin catalog module.
   * This mapper is intentionally defensive because some admin endpoints
   * return nested keys or slightly different property names.
   */
  getSubseries(): Observable<ArchivalSubseries[]> {
    return this.http.get<any>(`${this.apiRoot}/api/admin/subseries`).pipe(
      map((raw) =>
        extractArray(raw, ['subseries', 'subSeries']).map((item: any) => ({
          id: Number(item.id),
          code: String(item.codigo ?? item.code ?? ''),
          name: String(item.nombre ?? item.name ?? ''),
          serieId: Number(
            item.serie_id ??
              item.serieId ??
              item.serie?.id ??
              item.series_id ??
              item.seriesId ??
              0,
          ),
        })),
      ),
    );
  }

  /**
   * Loads archival expedientes from the existing admin catalog module.
   */
  getExpedientes(): Observable<ArchivalExpediente[]> {
    return this.http.get<any>(`${this.apiRoot}/api/admin/expedientes`).pipe(
      map((raw) =>
        extractArray(raw, ['expedientes']).map((item: any) => ({
          id: Number(item.id),
          code: String(item.codigo ?? item.code ?? ''),
          name: String(item.nombre ?? item.name ?? ''),
          serieId: Number(item.serie_id ?? item.serieId ?? item.serie?.id ?? 0),
          subserieId:
            item.subserie_id != null
              ? Number(item.subserie_id)
              : item.subserieId != null
                ? Number(item.subserieId)
                : item.subserie?.id != null
                  ? Number(item.subserie.id)
                  : null,
          unitId:
            item.unidad_id != null
              ? Number(item.unidad_id)
              : item.unitId != null
                ? Number(item.unitId)
                : item.unidad?.id != null
                  ? Number(item.unidad.id)
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
