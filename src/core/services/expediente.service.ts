import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SerieLite {
  id: number;
  codigo?: string;
  nombre: string;
  unidad_id?: number;
  unidad_nombre?: string | null;
}

export interface SubserieLite {
  id: number;
  codigo?: string;
  nombre: string;
  serie_id: number;
  serie_nombre?: string | null;
}

export interface Expediente {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  fecha_creacion?: string;
  fecha_cierre?: string | null;
  estado: 'ACTIVO' | 'CERRADO' | 'TRANSFERIDO' | 'ELIMINADO';
  unidad_id: number;
  serie_id: number;
  subserie_id?: number | null;
  unidad_nombre?: string | null;
  serie_nombre?: string | null;
  subserie_nombre?: string | null;
  created_by?: number | null;
  updated_at?: string;
}

export interface CreateExpedienteDto {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  unidad_id: number;
  serie_id: number;
  subserie_id?: number | null;
  estado?: 'ACTIVO' | 'CERRADO' | 'TRANSFERIDO' | 'ELIMINADO';
  created_by?: number | null;
}

export interface UpdateExpedienteDto {
  codigo?: string;
  nombre?: string;
  descripcion?: string | null;
  unidad_id?: number;
  serie_id?: number;
  subserie_id?: number | null;
  estado?: 'ACTIVO' | 'CERRADO' | 'TRANSFERIDO' | 'ELIMINADO';
  fecha_cierre?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ExpedienteService {
  private http = inject(HttpClient);

  private readonly baseUrl = 'http://localhost:3000/api/expedientes';
  private readonly seriesUrl = 'http://localhost:3000/api/series';
  private readonly subseriesUrl = 'http://localhost:3000/subseries';

  getExpedientes(filters?: {
    unidad_id?: number;
    serie_id?: number;
    subserie_id?: number;
    estado?: string;
  }): Observable<Expediente[]> {
    let params = new HttpParams();

    if (filters?.unidad_id != null) {
      params = params.set('unidad_id', filters.unidad_id);
    }
    if (filters?.serie_id != null) {
      params = params.set('serie_id', filters.serie_id);
    }
    if (filters?.subserie_id != null) {
      params = params.set('subserie_id', filters.subserie_id);
    }
    if (filters?.estado) {
      params = params.set('estado', filters.estado);
    }

    return this.http.get<Expediente[]>(this.baseUrl, { params });
  }

  getExpedienteById(id: number): Observable<Expediente> {
    return this.http.get<Expediente>(`${this.baseUrl}/${id}`);
  }

  createExpediente(dto: CreateExpedienteDto): Observable<any> {
    return this.http.post(this.baseUrl, dto);
  }

  updateExpediente(id: number, dto: UpdateExpedienteDto): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, dto);
  }

  deleteExpediente(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  getSeries(unidadId?: number): Observable<SerieLite[]> {
    let params = new HttpParams();

    if (unidadId != null) {
      params = params.set('unidad_id', unidadId);
    }

    return this.http.get<SerieLite[]>(this.seriesUrl, { params });
  }

  getSubseries(serieId?: number): Observable<SubserieLite[]> {
    return this.http.get<SubserieLite[]>(this.subseriesUrl).pipe(
      map((rows) =>
        serieId != null ? rows.filter((s) => s.serie_id === serieId) : rows
      )
    );
  }
}
