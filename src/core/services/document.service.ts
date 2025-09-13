import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DocumentModel {
  id: string;
  titulo: string;
  numero_serie: string;
  estado: 'borrador' | 'firmado-parcial' | 'firmado-completo' | 'archivado';
  unidad?: {
    id: string;
    nombre: string;
    descripcion: string;
  };
  usuario_id: string;
  categoria?: {
    id: string;
    nombre: string;
    descripcion: string;
  };
  fecha: string;
  fechaModificacion?: string;
  keywords?: string[];
  descripcion?: string;
  oficialCodigo?: string;
  pages?: number;
  isBeingEdited?: boolean;
  editedBy?: string;
  serie?: string;
  fileFormat?: string;
  hasComments?: boolean;
  pendingSignatures?: number;
  totalSignatures?: number;
  currentSigners?: string[];
}


export interface VDocumentModel {
  documento_nombre: string;   // Renombrado de 'titulo'
  documento_estado: string;   // Renombrado de 'estado'
  primer_usuario: string;     // Renombrado de 'usuario_id' o 'primer_usuario'
  fecha_creacion: string;     // Renombrado de 'fecha'
  unidad_nombre: string;      // Renombrado de 'unidad_nombre'
  categoria_nombre: string;   // Renombrado de 'categoria_nombre'
  firmas_obtenidas : number; // Renombrado de 'firmas_obtenidas'
  firmas_requeridas: number;     // Renombrado de 'total_firmas'
}
@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  private apiUrl = `${environment.apiUrl}/documents`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<DocumentModel[]> {
    return this.http.get<DocumentModel[]>(`${this.apiUrl}`);
  }

  getById(id: string): Observable<DocumentModel> {
    return this.http.get<DocumentModel>(`${this.apiUrl}/${id}`);
  }

  create(document: DocumentModel): Observable<DocumentModel> {
    return this.http.post<DocumentModel>(`${this.apiUrl}`, document);
  }

  update(id: string, document: DocumentModel): Observable<DocumentModel> {
    return this.http.put<DocumentModel>(`${this.apiUrl}${id}`, document);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}`);
  }

  getDocumentsFromProduction(): Observable<VDocumentModel[]> {
    return this.http.get<VDocumentModel[]>(`${this.apiUrl}/view/production`);
  }
}
