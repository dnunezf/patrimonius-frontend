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
  estadoEtiqueta?: string;
};

export type ConsultaSearchResponse = {
  items: ConsultaDocumentoRow[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
  viewer: 'interno' | 'externo';
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

  search(q: ConsultaSearchQuery): Observable<ConsultaSearchResponse> {
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

  download(documentoId: number): Observable<Blob> {
    return this.http.get(`${this.base}/${documentoId}/download`, {
      responseType: 'blob',
    });
  }
}
