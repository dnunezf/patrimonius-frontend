import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { map, Observable } from 'rxjs';

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
};

@Injectable({ providedIn: 'root' })
export class ConsultaAprobadosApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/documents`;

  getFilterOptions(): Observable<ConsultaFiltrosOpciones> {
    return this.http.get<ConsultaFiltrosOpciones>(
      `${this.base}/search-approved/filters`,
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
    return this.http
      .get<any[]>(`${environment.apiUrl}/documentos/externos`)
      .pipe(
        map((rows) => {
          let mapped: ConsultaDocumentoRow[] = (rows ?? []).map((r) => ({
            id: Number(r.id),
            codigo: r.numero_serie ?? '',
            titulo: r.titulo ?? '',
            estado: r.estado ?? '',
            fecha_aprobacion: r.fecha ?? '',
            unidad_nombre: r.unidad_nombre ?? null,
            categoria_nombre: r.categoria ?? null,
            autor_nombre: r.autor_nombre ?? null,
            canView: !!r.canView,
            canDownload: !!r.canDownload,
            estadoEtiqueta: r.estado ?? '',
          }));

          const qText = String(q.q ?? '').trim().toLowerCase();
          if (qText) {
            mapped = mapped.filter((row) =>
              [
                row.codigo,
                row.titulo,
                row.categoria_nombre,
                row.unidad_nombre,
                row.autor_nombre,
              ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(qText),
            );
          }

          if (q.categoriaId) {
            const cat = String(q.categoriaId).trim().toLowerCase();
            mapped = mapped.filter(
              (row) => String(row.categoria_nombre ?? '').toLowerCase() === cat,
            );
          }

          if (q.dateFrom) {
            const from = new Date(q.dateFrom);
            mapped = mapped.filter((row) => {
              if (!row.fecha_aprobacion) return false;
              return new Date(row.fecha_aprobacion) >= from;
            });
          }

          if (q.dateTo) {
            const to = new Date(q.dateTo);
            to.setHours(23, 59, 59, 999);
            mapped = mapped.filter((row) => {
              if (!row.fecha_aprobacion) return false;
              return new Date(row.fecha_aprobacion) <= to;
            });
          }

          const page = Number(q.page ?? 1);
          const pageSize = Number(q.pageSize ?? 10);
          const totalItems = mapped.length;
          const totalDescargables = mapped.filter((r) => r.canDownload).length;
          const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
          const start = (page - 1) * pageSize;
          const items = mapped.slice(start, start + pageSize);

          return {
            items,
            totalItems,
            totalDescargables,
            totalPages,
            page,
            pageSize,
            viewer: 'externo' as const,
          };
        }),
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
    }>(`${environment.apiUrl}/documentos/${documentoId}/contenido`);
  }

  download(documentoId: number): Observable<Blob> {
    return this.http.get(
      `${environment.apiUrl}/documentos/${documentoId}/firma/descargar/pdf`,
      { responseType: 'blob' },
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
}
