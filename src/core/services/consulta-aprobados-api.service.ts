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
  totalDescargables?: number;
  filtroUnidadUsuario?: number | null;
  aplicaFiltroUnidad?: boolean;
};

export type ConsultaExpedienteRow = {
  id: number;
  codigo: string;
  nombre: string;
  estado?: string | null;
  unidad_nombre?: string | null;
  serie_nombre?: string | null;
  subserie_nombre?: string | null;
  total_documentos?: number;
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

@Injectable({ providedIn: 'root' })
export class ConsultaAprobadosApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/documents`;
  private readonly expedientesBase = `${environment.apiUrl}/api/expedientes`;

  getDocumentosAccesoExpediente(expedienteId: number) {
    return this.http.get<ConsultaDocumentoRow[]>(
      `${this.expedientesBase}/${expedienteId}/documentos-acceso`,
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

  download(documentoId: number): Observable<Blob> {
    return this.downloadConsulta(documentoId);
  }

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
