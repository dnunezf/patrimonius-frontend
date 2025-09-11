import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';  // Necesitamos importar catchError
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
  getRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${this.base}/roles`).pipe(
      catchError(this.handleError) // Manejar errores de roles
    );
  }

  createRol(data: Partial<Rol>): Observable<Rol> {
    return this.http.post<Rol>(`${this.base}/roles`, data).pipe(
      catchError(this.handleError) // Manejar errores de crear rol
    );
  }

  updateRol(id: number, data: Partial<Rol>): Observable<Rol> {
    return this.http.patch<Rol>(`${this.base}/roles/${id}`, data).pipe(
      catchError(this.handleError) // Manejar errores de actualizar rol
    );
  }

  deleteRol(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/roles/${id}`).pipe(
      catchError(this.handleError) // Manejar errores de eliminar rol
    );
  }

  // UNIDADES
  getUnidades(): Observable<Unidad[]> {
    return this.http.get<Unidad[]>(`${this.base}/unidades`).pipe(
      catchError(this.handleError) // Manejar errores de unidades
    );
  }

  createUnidad(data: Partial<Unidad>): Observable<Unidad> {
    return this.http.post<Unidad>(`${this.base}/unidades`, data).pipe(
      catchError(this.handleError) // Manejar errores de crear unidad
    );
  }

  updateUnidad(id: number, data: Partial<Unidad>): Observable<Unidad> {
    return this.http.patch<Unidad>(`${this.base}/unidades/${id}`, data).pipe(
      catchError(this.handleError) // Manejar errores de actualizar unidad
    );
  }

  deleteUnidad(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/unidades/${id}`).pipe(
      catchError(this.handleError) // Manejar errores de eliminar unidad
    );
  }

  // PLANTILLAS
  getPlantillas(): Observable<Plantilla[]> {
    return this.http.get<Plantilla[]>(`${this.base}/plantillas`).pipe(
      catchError(this.handleError) // Manejar errores de plantillas
    );
  }

  /** Subida via Multer: campo 'file' + resto de campos */
  uploadPlantilla(p: { nombre: string; version: string; descripcion?: string; file: File }): Observable<Plantilla> {
    const fd = new FormData();
    fd.append('nombre', p.nombre);
    fd.append('version', p.version);
    if (p.descripcion) fd.append('descripcion', p.descripcion);
    fd.append('file', p.file); // <-- nombre del campo en el backend
    return this.http.post<Plantilla>(`${this.base}/plantillas`, fd).pipe(
      catchError(this.handleError) // Manejar errores de subida de plantilla
    );
  }

  updatePlantilla(id: number, data: Partial<Plantilla>): Observable<Plantilla> {
    return this.http.patch<Plantilla>(`${this.base}/plantillas/${id}`, data).pipe(
      catchError(this.handleError) // Manejar errores de actualizar plantilla
    );
  }

  deletePlantilla(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/plantillas/${id}`).pipe(
      catchError(this.handleError) // Manejar errores de eliminar plantilla
    );
  }

  // Función para manejar errores globalmente
  private handleError(error: any) {
    // Puedes agregar más lógica de manejo de errores si es necesario
    console.error('Error en la solicitud HTTP:', error);
    let errorMessage = 'Ocurrió un error desconocido';

    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return throwError(errorMessage); // Lanza el error para ser capturado en el componente
  }
}
