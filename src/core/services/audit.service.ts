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

export interface SecurityItem {
  id_evento: number;
  fecha_hora: string;
  usuario: string | null;
  accion: string | null;
  resultado: string | null;
  tipo_evento: string | null;
  ip: string | null;
  user_agent: string | null;
}

export interface SecurityDetail {
  id_evento: number;
  fecha_evento: string;
  accion: string | null;
  resultado: string | null;
  usuario_email: string | null;
  usuario_nombre: string | null;
  usuario_apellido1: string | null;
  usuario_apellido2: string | null;
  rol_usuario: string | null;
  tipo_evento: string | null;
  ip: string | null;
  user_agent: string | null;
  detalle: any; // JSON
}

export interface SecurityPage {
  items: SecurityItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Lista desde VW_Bitacora_Permisos_Lista. */
export interface PermissionBitacoraItem {
  id_registro: number;
  fecha_hora: string;
  solicitud_id: string | null;
  titulo_documento: string | null;
  numero_serie_documento: string | null;
  responsable_id: number | null;
  responsable_email: string | null;
  usuario_objetivo_email: string | null;
  tipo_flujo: string | null;
  estado_flujo: string | null;
  accion: string | null;
  fecha_inicio_acceso: string | null;
  fecha_fin_acceso: string | null;
}

/** Detalle desde VW_Bitacora_Permisos_Detalle. */
export interface PermissionBitacoraDetail {
  id_registro: number;
  solicitud_id: string | null;
  documento_id: number | null;
  documento_titulo_actual: string | null;
  documento_titulo_snapshot: string | null;
  documento_numero_serie_actual: string | null;
  documento_codigo_snapshot: string | null;
  responsable_id: number | null;
  responsable_email: string | null;
  responsable_nombre_completo: string | null;
  target_usuario_id: number | null;
  usuario_objetivo_email: string | null;
  usuario_objetivo_nombre_completo: string | null;
  accion: string | null;
  resultado: string | null;
  permisos: string | null;
  tipo_flujo: string | null;
  estado_flujo: string | null;
  justificacion: string | null;
  fecha_inicio_acceso: string | null;
  fecha_fin_acceso: string | null;
  user_agent: string | null;
  detalle: unknown;
}

export interface PermissionBitacoraPage {
  items: PermissionBitacoraItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}


@Injectable({ providedIn: 'root' })
export class AuditService {
  private base = `${environment.apiUrl}/audit`;
  private permissionBitacoraBase = `${environment.apiUrl}/audit/permission-bitacora`;

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

  listSecurityEvents(opts: {
    page?: number;
    pageSize?: number;
    q?: string;
    usuario?: string;
    tipoEvento?: string;
    accion?: string;
    resultado?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }) {
    let params = new HttpParams();
    Object.entries(opts || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && `${v}`.trim() !== '') {
        params = params.set(k, String(v));
      }
    });
    return this.http.get<SecurityPage>(`${this.base}/security/events`, { params });
  }

  getSecurityTypes(): Observable<string[]> {
    return this.http
      .get<{ items: string[] }>(`${this.base}/security/types`)
      .pipe(map((res) => res.items || []));
  }

  getSecurityActions(): Observable<string[]> {
    return this.http
      .get<{ items: string[] }>(`${this.base}/security/actions`)
      .pipe(map((res) => res.items || []));
  }

  getSecurityEventDetail(id: number): Observable<SecurityDetail> {
    return this.http
      .get<{ item: SecurityDetail }>(`${this.base}/security/events/${id}`)
      .pipe(map((res) => res.item));
  }

  listPermissionBitacoraEvents(opts: {
    page?: number;
    pageSize?: number;
    q?: string;
    tipoFlujo?: string;
    estadoFlujo?: string;
    accion?: string;
    usuario?: string;
    documento?: string;
    from?: string;
    to?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }) {
    const o = opts || {};
    const page = o.page ?? 1;
    const pageSize = o.pageSize ?? 25;
    const sortBy = (o.sortBy && String(o.sortBy).trim()) || 'fecha_hora';
    const sortDir =
      o.sortDir === 'asc' || o.sortDir === 'desc' ? o.sortDir : 'desc';

    let params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize))
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    const optional: (keyof typeof o)[] = [
      'q',
      'tipoFlujo',
      'estadoFlujo',
      'accion',
      'usuario',
      'documento',
      'from',
      'to',
    ];
    for (const key of optional) {
      const v = o[key];
      if (v !== undefined && v !== null && `${v}`.trim() !== '') {
        params = params.set(String(key), String(v));
      }
    }

    return this.http.get<PermissionBitacoraPage>(
      `${this.permissionBitacoraBase}/events`,
      { params },
    );
  }

  getPermissionBitacoraDetail(id: number): Observable<PermissionBitacoraDetail> {
    return this.http
      .get<{ item: PermissionBitacoraDetail }>(
        `${this.permissionBitacoraBase}/events/${id}`,
      )
      .pipe(map((res) => res.item));
  }

  getPermissionBitacoraTipoFlujo(): Observable<string[]> {
    return this.http
      .get<{ items: string[]; totalItems?: number }>(
        `${this.permissionBitacoraBase}/tipo-flujo`,
      )
      .pipe(map((res) => res.items || []));
  }

  getPermissionBitacoraEstadoFlujo(): Observable<string[]> {
    return this.http
      .get<{ items: string[]; totalItems?: number }>(
        `${this.permissionBitacoraBase}/estado-flujo`,
      )
      .pipe(map((res) => res.items || []));
  }
}
