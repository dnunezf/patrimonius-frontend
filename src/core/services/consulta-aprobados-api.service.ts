import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

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

export type ConsultaSearchQuery = {
  q?: string;
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
  /** Solo panel externo: fuerza catálogo + permisos por solicitud (multi-rol con USUARIO_EXTERNO). */
  panelExterno?: string | boolean;
};

@Injectable({ providedIn: 'root' })
export class ConsultaAprobadosApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/documents`;

  /**
   * @param panelExterno Si true, filtros del catálogo completo (panel consulta externa / HU-024).
   */
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
  download(documentoId: number): Observable<Blob> {
    return this.downloadConsulta(documentoId);
  }

  /**
   * HU-025: descarga alineada con la búsqueda (`assertCanAccess` + bitácora).
   */
  downloadConsulta(documentoId: number): Observable<Blob> {
    return this.http.get(`${this.base}/${documentoId}/download`, {
      responseType: 'blob',
    });
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
}
