import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { map, Observable } from 'rxjs';

export interface AuditItem {
  id_evento: number;
  fecha_hora: string;
  usuario: string;
  documento_titulo: string | null;
  documento_codigo_unico: string | null;
  documento_codigo_oficial: string | null;
  accion_solicitada: string | null;
  estado_documento: string | null;
  resultado: string | null;
  razon: string | null;
}

export interface AuditPage {
  items: AuditItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Detail payload from VW_Bitacora_Ciclo_Documental_Detalle. */
export interface AuditDetail {
  id_evento: number;
  fecha_evento: string;
  accion: string | null;
  resultado: string | null;
  usuario_email: string | null;
  usuario_nombre: string | null;
  usuario_apellido1: string | null;
  usuario_apellido2: string | null;
  rol_usuario: string | null;
  documento_titulo: string | null;
  documento_codigo: string | null;
  documento_estado: string | null;
  evento_ciclo: string | null;
  accion_solicitada: string | null;
  motivo: string | null;
  descripcion: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  private base = `${environment.apiUrl}/audit`;

  constructor(private http: HttpClient) {}

  listEvents(opts: {
    page?: number;
    pageSize?: number;
    q?: string;
    estado?: string;
    resultado?: string;
    usuario?: string;
    documento?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc'; 
  }) {
    let params = new HttpParams();
    Object.entries(opts || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && `${v}`.trim() !== '') {
        params = params.set(k, String(v));
      }
    });
    return this.http.get<AuditPage>(`${this.base}/events`, { params });
  }

  // Helpers to build export URLs
  buildExportUrl(format: 'csv' | 'xml', opts: Record<string, any>) {
    const endpoint = format === 'csv' ? 'events/csv' : 'events/xml';
    const url = new URL(`${this.base}/${endpoint}`);
    Object.entries(opts || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && `${v}`.trim() !== '') {
        url.searchParams.set(k, String(v));
      }
    });
    return url.toString();
  }

  getDocumentStates(): Observable<string[]> {
    return this.http
      .get<{ items: string[] }>(`${this.base}/documents/states`)
      .pipe(map((res) => res.items || []));
  }

  exportEvents(
    format: 'csv' | 'xml',
    opts: Record<string, any>
  ): Observable<HttpResponse<Blob>> {
    let params = new HttpParams();
    Object.entries(opts || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && `${v}`.trim() !== '') {
        params = params.set(k, String(v));
      }
    });

    const endpoint = format === 'csv' ? 'events/csv' : 'events/xml';
    return this.http.get(`${this.base}/${endpoint}`, {
      params,
      responseType: 'blob',
      observe: 'response',
    });
  }
  /** Fetch a single audit event detail. */
  getEventDetail(id: number): Observable<AuditDetail> {
    return this.http
      .get<{ item: AuditDetail }>(`${this.base}/events/${id}`)
      .pipe(map((res) => res.item));
  }

  getActionTypes() {
    return this.http
      .get<{ items: string[] }>(`${this.base}/log/events`)
      .pipe(map((res) => res.items || []));
  }
}
