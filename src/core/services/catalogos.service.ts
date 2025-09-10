import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type Rol = { id: number; nombre: string; descripcion?: string };
export type Unidad = { id: number; nombre: string; descripcion?: string };
export type Plantilla = {
  id: number;
  nombre: string;
  version: string;
  descripcion?: string;
  ruta_archivo: string;
};

@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private base = `${environment.apiUrl}/admin`; // http://localhost:3000/admin

  constructor(private http: HttpClient) {}

  // ROLES
  getRoles(): Observable<Rol[]> { return this.http.get<Rol[]>(`${this.base}/roles`); }
  createRol(data: Partial<Rol>): Observable<Rol> { return this.http.post<Rol>(`${this.base}/roles`, data); }
  updateRol(id: number, data: Partial<Rol>): Observable<Rol> { return this.http.patch<Rol>(`${this.base}/roles/${id}`, data); }
  deleteRol(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/roles/${id}`); }

  // UNIDADES
  getUnidades(): Observable<Unidad[]> { return this.http.get<Unidad[]>(`${this.base}/unidades`); }
  createUnidad(data: Partial<Unidad>): Observable<Unidad> { return this.http.post<Unidad>(`${this.base}/unidades`, data); }
  updateUnidad(id: number, data: Partial<Unidad>): Observable<Unidad> { return this.http.patch<Unidad>(`${this.base}/unidades/${id}`, data); }
  deleteUnidad(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/unidades/${id}`); }

  // PLANTILLAS
  getPlantillas(): Observable<Plantilla[]> { return this.http.get<Plantilla[]>(`${this.base}/plantillas`); }

  /** Subida via Multer: campo 'file' + resto de campos */
  uploadPlantilla(p: { nombre: string; version: string; descripcion?: string; file: File }): Observable<Plantilla> {
    const fd = new FormData();
    fd.append('nombre', p.nombre);
    fd.append('version', p.version);
    if (p.descripcion) fd.append('descripcion', p.descripcion);
    fd.append('file', p.file); // <-- nombre del campo en el backend
    return this.http.post<Plantilla>(`${this.base}/plantillas`, fd);
  }

  updatePlantilla(id: number, data: Partial<Plantilla>): Observable<Plantilla> {
    return this.http.patch<Plantilla>(`${this.base}/plantillas/${id}`, data);
  }

  deletePlantilla(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/plantillas/${id}`);
  }
}
