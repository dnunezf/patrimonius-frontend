import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Serie {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  unidad_id: number;
  unidad_nombre?: string | null;
  plazo_conservacion_anios?: number | null;
  activa?: number | boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSerieDto {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  unidad_id: number;
  plazo_conservacion_anios: number;
  activa?: number | boolean;
}

export interface UpdateSerieDto {
  codigo?: string;
  nombre?: string;
  descripcion?: string | null;
  unidad_id?: number;
  plazo_conservacion_anios?: number;
  activa?: number | boolean;
}

@Injectable({ providedIn: 'root' })
export class CatalogoSerieService {
  private http = inject(HttpClient);

  private readonly baseUrl = 'http://localhost:3000/api/admin/series';

  getSeries(unidadId?: number): Observable<Serie[]> {
    let params = new HttpParams();

    if (unidadId != null) {
      params = params.set('unidad_id', unidadId);
    }

    return this.http.get<Serie[]>(this.baseUrl, { params });
  }

  getSerieById(id: number): Observable<Serie> {
    return this.http.get<Serie>(`${this.baseUrl}/${id}`);
  }

  createSerie(dto: CreateSerieDto): Observable<any> {
    return this.http.post(this.baseUrl, dto);
  }

  updateSerie(id: number, dto: UpdateSerieDto): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, dto);
  }

  deleteSerie(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
