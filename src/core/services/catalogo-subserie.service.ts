import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SerieLite {
  id: number;
  codigo?: string;
  nombre: string;
  unidad_id?: number;
  unidad_nombre?: string | null;
}

export interface Subserie {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  serie_id: number;
  serie_nombre?: string | null;
  unidad_id?: number | null;
  activa?: number | boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSubserieDto {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  serie_id: number;
  activa?: number | boolean;
}

export interface UpdateSubserieDto {
  codigo?: string;
  nombre?: string;
  descripcion?: string | null;
  serie_id?: number;
  activa?: number | boolean;
}

@Injectable({ providedIn: 'root' })
export class CatalogoSubserieService {
  private http = inject(HttpClient);

  private readonly baseUrl = `${environment.apiUrl}/api/admin/subseries`;
  private readonly seriesUrl = `${environment.apiUrl}/api/admin/series`;

  getSubseries(serieId?: number): Observable<Subserie[]> {
    let params = new HttpParams();

    if (serieId != null) {
      params = params.set('serie_id', serieId);
    }

    return this.http.get<Subserie[]>(this.baseUrl, { params });
  }

  getSubserieById(id: number): Observable<Subserie> {
    return this.http.get<Subserie>(`${this.baseUrl}/${id}`);
  }

  createSubserie(dto: CreateSubserieDto): Observable<any> {
    return this.http.post(this.baseUrl, dto);
  }

  updateSubserie(id: number, dto: UpdateSubserieDto): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, dto);
  }

  deleteSubserie(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  getSeries(): Observable<SerieLite[]> {
    return this.http.get<SerieLite[]>(this.seriesUrl);
  }
}
