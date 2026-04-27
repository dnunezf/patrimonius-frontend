import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, catchError } from 'rxjs';

export type ConsultaFiltrosOpciones = {
  categorias: { id: number; nombre: string }[];
  unidades: { id: number; nombre: string }[];
  series: { id: number; nombre: string; unidad_id?: number }[];
  subseries: { id: number; nombre: string; serie_id?: number }[];
};

export type ConsultaDocumentoRow = {
  id: number;
  codigo: string;
  titulo: string;
  estado: string;
  confid_level?: string;
  fecha_aprobacion: string;
  unidad_nombre?: string;
  categoria_nombre?: string | null;
  serie_nombre?: string | null;
  subserie_nombre?: string | null;
  expediente_codigo?: string | null;
  autor_nombre?: string | null;
  canPreview?: boolean;
  canDownload?: boolean;
  canView?: boolean;
  estadoEtiqueta?: string;
};

export type ConsultaSearchResponse = {
  items: ConsultaDocumentoRow[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
  viewer: 'interno' | 'externo';
  /** Consulta externa: filas con permiso de descarga (VIEW aprobado). */
  totalDescargables?: number;
  /** Unidad con la que filtra el backend (interno no administrador). */
  filtroUnidadUsuario?: number | null;
  aplicaFiltroUnidad?: boolean;
};

export type ConsultaExpedienteRow = {
  id: number;
  codigo: string;
  nombre: string;
  estado?: string | null;
  fecha_creacion?: string | null;
  unidad_nombre?: string | null;
  serie_nombre?: string | null;
  subserie_nombre?: string | null;
  total_documentos?: number;
  total_documentos_consulta?: number;
  total_documentos_elegibles?: number;
  canRequestAccess?: boolean;
  has_approved_access?: boolean;
  has_pending_request?: boolean;
};

export type ConsultaExpedienteSearchResponse = {
  items: ConsultaExpedienteRow[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

export type ConsultaSearchQuery = {
  q?: string;
  codigo?: string;
  titulo?: string;
  nombre?: string;
  soloConElegibles?: string | boolean;
  vista?: 'documentos' | 'expedientes';

  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  categoriaId?: number | string;
  unidadId?: number | string;
  serieId?: number | string;
  subserieId?: number | string;
  expedienteId?: number | string;
  dateFrom?: string;
  dateTo?: string;
  panelExterno?: string | boolean;
};

export type HistorialBusquedaRow = {
  id: number;
  usuario_id: number;
  texto_busqueda: string | null;
  filtros: Record<string, any> | null;
  fecha_consulta: string;
};

@Injectable({ providedIn: 'root' })
export class ConsultaAprobadosApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/documents`;
  private readonly expedientesBase = `${environment.apiUrl}/api/expedientes`;

  /** Si `panelExterno` es true, lista documentos con reglas de permiso en expediente (HU-024). */
  getDocumentosAccesoExpediente(expedienteId: number, panelExterno = false) {
    let params = new HttpParams();
    if (panelExterno) {
      params = params.set('panelExterno', '1');
    }
    return this.http.get<ConsultaDocumentoRow[]>(
      `${this.expedientesBase}/${expedienteId}/documentos-acceso`,
      { params },
    );
  }

  getFilterOptions(panelExterno = false): Observable<ConsultaFiltrosOpciones> {
    let params = new HttpParams();
    if (panelExterno) {
      params = params.set('panelExterno', '1');
    }
    return this.http.get<ConsultaFiltrosOpciones>(
      `${this.base}/search-approved/filters`,
      { params },
    );
  }

  searchInterno(q: ConsultaSearchQuery): Observable<ConsultaSearchResponse> {
    let params = new HttpParams();
    const entries = Object.entries(q).filter(
      ([, v]) => v !== undefined && v !== null && String(v).trim() !== '',
    );

    for (const [k, v] of entries) {
      params = params.set(k, String(v));
    }

    return this.http.get<ConsultaSearchResponse>(
      `${this.base}/search-approved`,
      { params },
    );
  }

  /**
   * Misma API que interno (`/documents/search-approved`): el backend aplica HU-025/HU-024
   * (catálogo completo aprobado/archivado firmado para usuario externo; permisos VIEW por solicitud).
   */
  searchExterno(q: ConsultaSearchQuery): Observable<ConsultaSearchResponse> {
    let params = new HttpParams().set('panelExterno', '1');
    const entries = Object.entries(q).filter(
      ([k, v]) =>
        k !== 'panelExterno' &&
        v !== undefined &&
        v !== null &&
        String(v).trim() !== '',
    );

    for (const [k, v] of entries) {
      params = params.set(k, String(v));
    }

    return this.http.get<ConsultaSearchResponse>(
      `${this.base}/search-approved`,
      { params },
    );
  }

  /**
   * Vista previa HU-025 (`assertCanAccess` + bitácora). Usa `/documents/:id/preview`.
   */
  getPreview(documentoId: number): Observable<{
    documento_id: number;
    titulo: string;
    estado: string;
    contenido: string;
    prefer_signed_pdf_view?: boolean;
    signed_pdf_url?: string | null;
  }> {
    return this.http.get<{
      documento_id: number;
      titulo: string;
      estado: string;
      contenido: string;
      prefer_signed_pdf_view?: boolean;
      signed_pdf_url?: string | null;
    }>(`${this.base}/${documentoId}/preview`);
  }

  getPreviewPdf(documentoId: number): Observable<Blob> {
    return this.http.get(`${this.base}/${documentoId}/preview-pdf`, {
      responseType: 'blob',
    });
  }

  /**
   * HU-025 / HU-027: misma ruta que interno — `GET /documents/:id/download`
   * (assertCanAccess + bitácora DESCARGA; permiso VIEW para externos).
   * No usar `/documentos/.../firma/descargar/pdf` aquí: esa ruta no registra consulta.
   */
  download(documentoId: number): Observable<HttpResponse<Blob>> {
    return this.downloadConsulta(documentoId);
  }

  /**
   * HU-025: descarga alineada con la búsqueda (`assertCanAccess` + bitácora).
   */
  downloadConsulta(documentoId: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.base}/${documentoId}/download`, {
      responseType: 'blob',
      observe: 'response',
    });
  }

  /**
   * Anexos en contexto HU-025: misma base que preview/descarga (`/documents/...`).
   * Si el backend aún no expone la ruta bajo `/documents`, se intenta el listado legado `/documentos/.../anexos`.
   */
  listAnexosConsulta(documentoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/${documentoId}/anexos`).pipe(
      catchError(() =>
        this.http.get<any[]>(
          `${environment.apiUrl}/documentos/${documentoId}/anexos`,
        ),
      ),
    );
  }

  /**
   * Descarga de anexo con `assertCanAccess` (misma familia que `downloadConsulta`).
   * Prueba `/download` y `/descargar` bajo `/documents` por compatibilidad de rutas.
   */
  downloadAnexoConsulta(documentoId: number, anexoId: number): Observable<Blob> {
    const basePath = `${this.base}/${documentoId}/anexos/${anexoId}`;
    const legacy = `${environment.apiUrl}/documentos/${documentoId}/anexos/${anexoId}/descargar`;
    return this.http.get(`${basePath}/download`, { responseType: 'blob' }).pipe(
      catchError(() =>
        this.http.get(`${basePath}/descargar`, { responseType: 'blob' }),
      ),
      catchError(() => this.http.get(legacy, { responseType: 'blob' })),
    );
  }

  createSolicitudAcceso(
    documentoId: number,
    payload: { justificacion: string },
  ) {
    return this.http.post(
      `${environment.apiUrl}/documentos/${documentoId}/solicitudes-acceso`,
      payload,
    );
  }

  listSolicitudesAcceso() {
    return this.http.get<any[]>(`${environment.apiUrl}/solicitudes-acceso`);
  }

  resolverSolicitudAcceso(
    solicitudId: number,
    payload: { estado_solicitud: 'APROBADA' | 'RECHAZADA'; motivo_resolucion: string }
  ) {
    return this.http.patch(
      `${environment.apiUrl}/solicitudes-acceso/${solicitudId}/resolver`,
      payload
    );
  }

  /*Para el historial de busquedaaa*/
  getHistorialBusquedas(limit = 10): Observable<HistorialBusquedaRow[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<HistorialBusquedaRow[]>(
      `${environment.apiUrl}/historial-busquedas`,
      { params },
    );
  }

  clearHistorialBusquedas(): Observable<{ deletedCount: number }> {
    return this.http.delete<{ deletedCount: number }>(
      `${environment.apiUrl}/historial-busquedas`,
    );
  }

  deleteHistorialBusqueda(id: number): Observable<{ deletedCount: number }> {
    return this.http.delete<{ deletedCount: number }>(
      `${environment.apiUrl}/historial-busquedas/${id}`,
    );
  }

  /**
   * ZIP con los PDF del expediente (misma lista que documentos-acceso).
   * `panelExterno`: true = solo documentos con permiso externo en el expediente.
   */
  downloadExpedienteZip(expedienteId: number, panelExterno = false): Observable<Blob> {
    let params = new HttpParams();
    if (panelExterno) {
      params = params.set('panelExterno', '1');
    }
    return this.http.get(`${this.expedientesBase}/${expedienteId}/download-zip`, {
      params,
      responseType: 'blob',
    });
  }

  searchExpedientesExternos(q: ConsultaSearchQuery): Observable<ConsultaExpedienteSearchResponse> {
    let params = new HttpParams().set('panelExterno', '1');
    const entries = Object.entries(q).filter(
      ([k, v]) =>
        k !== 'panelExterno' &&
        v !== undefined &&
        v !== null &&
        String(v).trim() !== '',
    );

    for (const [k, v] of entries) {
      params = params.set(k, String(v));
    }

    return this.http.get<ConsultaExpedienteSearchResponse>(
      `${this.expedientesBase}/search-access`,
      { params },
    );
  }

  /** Búsqueda de expedientes con reglas de consulta interna (unidad / master). */
  searchExpedientesInternos(q: ConsultaSearchQuery): Observable<ConsultaExpedienteSearchResponse> {
    let params = new HttpParams();
    const entries = Object.entries(q).filter(
      ([, v]) => v !== undefined && v !== null && String(v).trim() !== '',
    );

    for (const [k, v] of entries) {
      params = params.set(k, String(v));
    }

    return this.http.get<ConsultaExpedienteSearchResponse>(
      `${this.expedientesBase}/search-access`,
      { params },
    );
  }

  createSolicitudAccesoExpediente(
    expedienteId: number,
    payload: { justificacion: string },
  ) {
    return this.http.post(
      `${environment.apiUrl}/expedientes/${expedienteId}/solicitudes-acceso`,
      payload,
    );
  }

  listSolicitudesAccesoExpediente() {
    return this.http.get<any[]>(
      `${environment.apiUrl}/solicitudes-acceso-expediente`,
    );
  }

  resolverSolicitudAccesoExpediente(
    solicitudId: number,
    payload: {
      estado_solicitud: 'APROBADA' | 'RECHAZADA';
      motivo_resolucion: string;
    },
  ) {
    return this.http.patch(
      `${environment.apiUrl}/solicitudes-acceso-expediente/${solicitudId}/resolver`,
      payload,
    );
  }
}
