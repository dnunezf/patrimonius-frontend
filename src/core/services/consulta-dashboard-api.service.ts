import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { ConsultaDocumentoRow } from './consulta-aprobados-api.service';

export type ConsultaDashboardPeriodo = {
  desde: string;
  hasta: string;
};

export type ConsultaDashboardResumen = {
  periodo?: ConsultaDashboardPeriodo;
  /** @deprecated usar periodo */
  semana: { desde: string; hasta: string };
  recientes: {
    documento_id: number;
    fecha: string;
    codigo: string;
    titulo: string;
    estado: string;
  }[];
  recientesTotal?: number;
  recientesTotalPages?: number;
  recientesPage?: number;
  recientesPageSize?: number;
  descargasPorDocumento: {
    documento_id: number;
    codigo: string;
    titulo: string;
    veces: number;
    ultima_descarga: string;
  }[];
  descargasTotal?: number;
  descargasTotalPages?: number;
  descargasPage?: number;
  descargasPageSize?: number;
  novedades: ConsultaDocumentoRow[];
  novedadesTotal?: number;
  novedadesTotalPages?: number;
  novedadesPage?: number;
  novedadesPageSize?: number;
};

export type ConsultaResumenQuery = {
  recientesDesde?: string | null;
  descargasPage?: number;
  descargasPageSize?: number;
  descargasDesde?: string | null;
  novedadesPage?: number;
  novedadesPageSize?: number;
  novedadesDesde?: string | null;
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

  getResumen(q?: ConsultaResumenQuery): Observable<ConsultaDashboardResumen> {
    let params = new HttpParams();
    const o = q || {};
    if (o.recientesDesde)
      params = params.set('recientesDesde', o.recientesDesde);
    if (o.descargasPage != null)
      params = params.set('descargasPage', String(o.descargasPage));
    if (o.descargasPageSize != null)
      params = params.set('descargasPageSize', String(o.descargasPageSize));
    if (o.descargasDesde)
      params = params.set('descargasDesde', o.descargasDesde);
    if (o.novedadesPage != null)
      params = params.set('novedadesPage', String(o.novedadesPage));
    if (o.novedadesPageSize != null)
      params = params.set('novedadesPageSize', String(o.novedadesPageSize));
    if (o.novedadesDesde)
      params = params.set('novedadesDesde', o.novedadesDesde);
    return this.http.get<ConsultaDashboardResumen>(
      `${this.base}/consulta-dashboard/resumen`,
      { params },
    );
  }

  getHistorial(query: {
    page?: number;
    pageSize?: number;
    desde?: string | null;
  }): Observable<ConsultaHistorialResponse> {
    let params = new HttpParams();
    if (query.page != null) params = params.set('page', String(query.page));
    if (query.pageSize != null)
      params = params.set('pageSize', String(query.pageSize));
    if (query.desde) params = params.set('desde', query.desde);
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
