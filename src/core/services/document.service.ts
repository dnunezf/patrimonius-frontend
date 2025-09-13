import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DocumentModel } from 'src/app/shared/models/document.model';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private apiUrl = 'http://localhost:8080/api';  // Ajusta la URL según tu servidor backend

  constructor(private http: HttpClient) {}

  // Método para obtener todos los documentos
  getAll(): Observable<DocumentModel[]> {
    return this.http.get<DocumentModel[]>(`${this.apiUrl}/documentos`);
  }

  // Método para obtener un documento por su ID
  getById(id: string): Observable<DocumentModel> {
    return this.http.get<DocumentModel>(`${this.apiUrl}/documentos/${id}`);
  }

  // Método para crear un nuevo documento
  create(document: DocumentModel): Observable<DocumentModel> {
    return this.http.post<DocumentModel>(`${this.apiUrl}/documentos`, document);
  }

  // Método para actualizar un documento
  update(id: string, document: DocumentModel): Observable<DocumentModel> {
    return this.http.put<DocumentModel>(`${this.apiUrl}/documentos/${id}`, document);
  }

  // Método para eliminar un documento
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/documentos/${id}`);
  }
}
