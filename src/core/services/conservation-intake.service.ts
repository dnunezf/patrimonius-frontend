import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, EMPTY, map } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  ArchivalExpediente,
  ArchivalSeries,
  ArchivalSubseries,
  CandidateDoc,
  ConservationEadDocumentRow,
  EadExportFileResponse,
  EadPreviewResponse,
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

export type DispatchAttachment = {
  id: number;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  required?: boolean;
  selectedByDefault?: boolean;
  isMainDocument?: boolean;
};

export type ConservationDispatchDetail = {
  document: {
    id: number;
    officialCode: string;
    title: string;
    state: string;
    documentType?: string | null;
    producingUnit?: string | null;
    dispatchEmails?: string[];
  };
  attachments: DispatchAttachment[];
};

export type DispatchEmailPayload = {
  to: string[];
  cc?: string[];
  subject: string;
  message: string;
  attachmentIds: number[];
};

export type DispatchEmailResponse = {
  ok: boolean;
  message: string;
  dispatchId?: number;
  documentId: number;
};

function extractArray<T = any>(raw: any): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (Array.isArray(raw?.items)) return raw.items as T[];
  if (Array.isArray(raw?.rows)) return raw.rows as T[];
  if (Array.isArray(raw?.data)) return raw.data as T[];
  return [];
}

function parseDispositionFileName(headerValue: string | null): string | null {
  if (!headerValue) return null;

  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const plainMatch = headerValue.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1] || null;
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

  registerIntake(payload: IntakePayload): Observable<{
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
    return this.http.get<any>(`${this.apiRoot}/api/series`).pipe(
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
          plazo_conservacion_anios:
            item.plazo_conservacion_anios != null
              ? Number(item.plazo_conservacion_anios)
              : null,
        })),
      ),
    );
  }

  getSubseries(): Observable<ArchivalSubseries[]> {
    return this.http.get<any>(`${this.apiRoot}/subseries`).pipe(
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
    return this.http.get<any>(`${this.apiRoot}/api/expedientes`).pipe(
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
          latestDocumentDateISO:
            item.latestDocumentDateISO ??
            item.latest_document_date_iso ??
            item.latest_document_date ??
            null,
        })),
      ),
    );
  }

  /* =========================
   * HU-035 · EAD 2002 export
   * ========================= */

  /**
   * Returns archived conservation documents available for EAD 2002 export.
   */
  getConservationDocumentsForEad(): Observable<ConservationEadDocumentRow[]> {
    return this.http.get<any>(`${this.base}/ead/documents`).pipe(
      map((raw) =>
        extractArray(raw).map((item: any) => ({
          id: Number(item.id ?? item.documento_id ?? 0),
          officialCode: String(
            item.officialCode ?? item.official_code ?? item.numero_serie ?? '',
          ),
          title: String(item.title ?? item.titulo ?? ''),
          state: String(item.state ?? item.estado ?? ''),
          accessLevel:
            item.accessLevel ?? item.access_level ?? item.confid_level ?? null,

          serieId:
            item.serieId != null
              ? Number(item.serieId)
              : item.serie_id != null
                ? Number(item.serie_id)
                : null,
          serieCode:
            item.serieCode ?? item.serie_code ?? item.serie_codigo ?? null,
          serieName:
            item.serieName ?? item.serie_name ?? item.serie_nombre ?? null,

          subserieId:
            item.subserieId != null
              ? Number(item.subserieId)
              : item.subserie_id != null
                ? Number(item.subserie_id)
                : null,
          subserieCode:
            item.subserieCode ??
            item.subserie_code ??
            item.subserie_codigo ??
            null,
          subserieName:
            item.subserieName ??
            item.subserie_name ??
            item.subserie_nombre ??
            null,

          expedienteId:
            item.expedienteId != null
              ? Number(item.expedienteId)
              : item.expediente_id != null
                ? Number(item.expediente_id)
                : null,
          expedienteCode:
            item.expedienteCode ??
            item.expediente_code ??
            item.expediente_codigo ??
            null,
          expedienteName:
            item.expedienteName ??
            item.expediente_name ??
            item.expediente_nombre ??
            null,

          createdAtISO:
            item.createdAtISO ?? item.created_at_iso ?? item.fecha ?? null,
          eadStatus:
            item.eadStatus ??
            item.ead_status ??
            item.estado_ead ??
            'NO_EXPORTADO',
          lastExportedAtISO:
            item.lastExportedAtISO ??
            item.last_exported_at_iso ??
            item.ultima_exportacion ??
            null,
        })),
      ),
    );
  }

  /**
   * Returns export validation data, preview tree and XML preview.
   */
  getEadExportPreview(documentId: number): Observable<EadPreviewResponse> {
    return this.http.get<EadPreviewResponse>(
      `${this.base}/ead/documents/${documentId}/preview`,
    );
  }

  /**
   * Exports the EAD 2002 XML file and returns both blob and filename.
   */
  exportEadXml(documentId: number): Observable<EadExportFileResponse> {
    return this.http
      .post(`${this.base}/ead/documents/${documentId}/export`, null, {
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(
        map((response: HttpResponse<Blob>) => {
          const disposition = response.headers.get('content-disposition');
          return {
            blob: response.body as Blob,
            fileName: parseDispositionFileName(disposition),
          };
        }),
      );
  }

  /* =========================
   * HU-036 · Despacho por correo
   * ========================= */

  /**
   * Returns the document data, default recipients and available attachments
   * required to prepare the dispatch email dialog.
   */
  getDispatchDetail(
    documentId: number,
  ): Observable<ConservationDispatchDetail> {
    return this.http
      .get<any>(`${this.base}/documents/${documentId}/dispatch-email`)
      .pipe(
        map((raw) => {
          const documentRaw = raw?.document ?? raw?.documento ?? raw ?? {};
          const attachmentsRaw = extractArray<any>(
            raw?.attachments ?? raw?.anexos ?? raw?.files ?? [],
          );

          return {
            document: {
              id: Number(
                documentRaw.id ??
                  documentRaw.documento_id ??
                  documentRaw.documentId ??
                  documentId,
              ),
              officialCode: String(
                documentRaw.officialCode ??
                  documentRaw.official_code ??
                  documentRaw.numero_serie ??
                  '',
              ),
              title: String(documentRaw.title ?? documentRaw.titulo ?? ''),
              state: String(documentRaw.state ?? documentRaw.estado ?? ''),
              documentType:
                documentRaw.documentType ??
                documentRaw.document_type ??
                documentRaw.tipo_documental ??
                null,
              producingUnit:
                documentRaw.producingUnit ??
                documentRaw.producing_unit ??
                documentRaw.unidad_productora ??
                null,
              dispatchEmails: extractArray<string>(
                documentRaw.dispatchEmails ??
                  documentRaw.dispatch_emails ??
                  documentRaw.correos_despacho ??
                  [],
              ),
            },
            attachments: attachmentsRaw.map((item: any) => ({
              id: Number(item.id ?? item.attachmentId ?? item.anexo_id ?? 0),
              fileName: String(
                item.fileName ??
                  item.file_name ??
                  item.nombre_archivo ??
                  item.nombre ??
                  '',
              ),
              mimeType:
                item.mimeType ?? item.mime_type ?? item.tipo_mime ?? null,
              sizeBytes:
                item.sizeBytes != null
                  ? Number(item.sizeBytes)
                  : item.size_bytes != null
                    ? Number(item.size_bytes)
                    : item.tamano_bytes != null
                      ? Number(item.tamano_bytes)
                      : null,
              required: Boolean(item.required ?? item.obligatorio ?? false),
              selectedByDefault: Boolean(
                item.selectedByDefault ??
                item.selected_by_default ??
                item.seleccionado ??
                item.obligatorio ??
                false,
              ),
              isMainDocument: Boolean(
                item.isMainDocument ??
                item.is_main_document ??
                item.es_documento_principal ??
                false,
              ),
            })),
          };
        }),
      );
  }

  /**
   * Sends an official dispatch email for a conservation document.
   */
  sendDispatchEmail(
    documentId: number,
    payload: DispatchEmailPayload,
  ): Observable<DispatchEmailResponse> {
    return this.http.post<DispatchEmailResponse>(
      `${this.base}/documents/${documentId}/dispatch-email`,
      payload,
    );
  }

  /**
   * Returns dispatch history for a conservation document.
   * This can be used later for the "Historial" column.
   */
  getDispatchHistory(documentId: number): Observable<any[]> {
    return this.http
      .get<any>(`${this.base}/documents/${documentId}/dispatch-email/history`)
      .pipe(map((raw) => extractArray(raw)));
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
