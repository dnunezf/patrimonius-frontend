import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AccessExceptionService {
  private apiUrl = `${environment.apiUrl}/excepciones`; // Cambia la URL según sea necesario

  constructor(private http: HttpClient) {}

  // Crear una nueva excepción de acceso
  createException(exceptionData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, exceptionData);
  }

  // Listar todas las excepciones activas
  getActiveExceptions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}`);
  }

  // Eliminar una excepción de acceso
  deleteException(exceptionId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${exceptionId}`);
  }
}
