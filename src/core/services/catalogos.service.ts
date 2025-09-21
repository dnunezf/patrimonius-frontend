import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export type Rol = { idRol: number; nombreRol: string; descripcion?: string };
export type Unidad = { id: number; nombre: string; descripcion?: string };
export type Plantilla = {
  id: number; nombre: string; version: string; descripcion?: string; ruta_archivo: string;
};

@Injectable({ providedIn: 'root' })
export class CatalogosService {
  // ⚠️ Verifica que este prefijo coincida con tu backend:
  // si montaste las rutas en '/admin/module/catalogs', cambia el base.
  private base = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  // ===================== ROLES =====================
  getRoles(): Observable<Rol[]> {
    return this.http.get<any>(`${this.base}/roles`).pipe(
      // Normaliza varias formas de respuesta posibles
      map((raw: any) => Array.isArray(raw) ? raw : (raw?.data ?? raw)),
      map((rows: any[]) =>
        rows.map((r: any, i: number) =>
          // Fallback si el backend aún enviara ["ADMIN", ...]
          typeof r === 'string'
            ? ({ idRol: i + 1, nombreRol: r, descripcion: '' })
            : ({
              idRol: r.idRol ?? r.id,                // acepta alias antiguos
              nombreRol: r.nombreRol ?? r.nombre,    // idem
              descripcion: r.descripcion ?? ''
            })
        )
      ),
      catchError(this.handleError)
    );
  }

  createRol(data: Partial<Rol>): Observable<Rol> {
    // Enviamos la forma nueva; tu backend ya acepta nombreRol (o nombre)
    const body = {
      nombreRol: data.nombreRol,
      descripcion: data.descripcion ?? null
    };
    return this.http.post<Rol>(`${this.base}/roles`, body).pipe(
      catchError(this.handleError)
    );
  }

  updateRol(idRol: number, data: Partial<Rol>): Observable<Rol> {
    const body = {
      nombreRol: data.nombreRol,
      descripcion: data.descripcion ?? null
    };
    // PATCH o PUT según tu backend; mantengo PATCH como tenías
    return this.http.patch<Rol>(`${this.base}/roles/${idRol}`, body).pipe(
      catchError(this.handleError)
    );
  }

  deleteRol(idRol: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/roles/${idRol}`).pipe(
      catchError(this.handleError)
    );
  }

  // ===================== UNIDADES =====================
  getUnidades(): Observable<Unidad[]> {
    return this.http.get<Unidad[]>(`${this.base}/unidades`).pipe(
      catchError(this.handleError)
    );
  }
  createUnidad(data: Partial<Unidad>): Observable<Unidad> {
    return this.http.post<Unidad>(`${this.base}/unidades`, data).pipe(
      catchError(this.handleError)
    );
  }
  updateUnidad(id: number, data: Partial<Unidad>): Observable<Unidad> {
    return this.http.patch<Unidad>(`${this.base}/unidades/${id}`, data).pipe(
      catchError(this.handleError)
    );
  }
  deleteUnidad(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/unidades/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // ===================== PLANTILLAS =====================
  getPlantillas(): Observable<Plantilla[]> {
    return this.http.get<Plantilla[]>(`${this.base}/plantillas`).pipe(
      catchError(this.handleError)
    );
  }
  uploadPlantilla(p: { nombre: string; version: string; descripcion?: string; file: File }): Observable<Plantilla> {
    const fd = new FormData();
    fd.append('nombre', p.nombre);
    fd.append('version', p.version);
    if (p.descripcion) fd.append('descripcion', p.descripcion);
    fd.append('file', p.file);
    return this.http.post<Plantilla>(`${this.base}/plantillas`, fd).pipe(
      catchError(this.handleError)
    );
  }
  updatePlantilla(id: number, data: Partial<Plantilla>): Observable<Plantilla> {
    return this.http.patch<Plantilla>(`${this.base}/plantillas/${id}`, data).pipe(
      catchError(this.handleError)
    );
  }
  deletePlantilla(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/plantillas/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // ===================== ERRORS =====================
  private handleError(error: any) {
    console.error('Error en la solicitud HTTP:', error);
    let errorMessage = 'Ocurrió un error desconocido';
    if (error?.error?.message) errorMessage = error.error.message;
    else if (error?.message) errorMessage = error.message;
    return throwError(errorMessage);
  }
}
