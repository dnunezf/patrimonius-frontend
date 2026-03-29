import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { ConsultaDocumentoRow } from './consulta-aprobados-api.service';

export type ConsultaDashboardResumen = {
  semana: { desde: string; hasta: string };
  recientes: {
    documento_id: number;
    fecha: string;
    codigo: string;
    titulo: string;
    estado: string;
  }[];
  descargasPorDocumento: {
    documento_id: number;
    codigo: string;
    titulo: string;
    veces: number;
    ultima_descarga: string;
  }[];
  novedades: ConsultaDocumentoRow[];
};

export type ConsultaHistorialItem = {
  id: number;
  fecha: string;
  accion: string;
  documento_id: number | null;
  codigo: string | null;
  titulo: string | null;
  actividad: string;
};

export type ConsultaHistorialResponse = {
  items: ConsultaHistorialItem[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

@Injectable({ providedIn: 'root' })
export class ConsultaDashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/documents`;

  getResumen(): Observable<ConsultaDashboardResumen> {
    return this.http.get<ConsultaDashboardResumen>(
      `${this.base}/consulta-dashboard/resumen`,
    );
  }

  getHistorial(query: {
    page?: number;
    pageSize?: number;
  }): Observable<ConsultaHistorialResponse> {
    let params = new HttpParams();
    if (query.page != null) params = params.set('page', String(query.page));
    if (query.pageSize != null)
      params = params.set('pageSize', String(query.pageSize));
    return this.http.get<ConsultaHistorialResponse>(
      `${this.base}/consulta-dashboard/historial`,
      { params },
    );
  }

  documentosPorIds(ids: number[]): Observable<{ items: ConsultaDocumentoRow[] }> {
    return this.http.post<{ items: ConsultaDocumentoRow[] }>(
      `${this.base}/consulta-dashboard/documentos-por-ids`,
      { ids },
    );
  }
}
