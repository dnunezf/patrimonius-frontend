import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {map, Observable} from 'rxjs';
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
  documento_nombre: string;
  documento_estado: string;
  primer_usuario: string;
  fecha_creacion: string;
  unidad_nombre: string;
  categoria_nombre: string;
  firmas_obtenidas : number;
  firmas_requeridas: number;
}

// 1) Define la fila “cruda” que devuelve la vista
export interface AccessibleDocRow {
  viewer_usuario_id: number;
  documento_id: number;
  numero_serie: string;
  titulo: string;
  estado: string;
  fecha_creacion: string;   // DATETIME -> string
  unidad_id: number;
  unidad_nombre: string;
  creador_id: number;
  creador_nombre: string;
  categoria_nombre2: string | null;
  firmas_requeridas: number;
  firmas_obtenidas: number;
}


@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  private apiUrl = `${environment.apiUrl}/documents`;

  constructor(private http: HttpClient) {}

  // Métodos existentes para manejar documentos
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

  // Método para obtener las plantillas
  getPlantillas(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:3000/plantillas/listaplantilla');  // Asegúrate de que esta ruta sea correcta
  }

  // Obtener documentos en producción
  getDocumentsFromProduction(): Observable<VDocumentModel[]> {
    return this.http.get<AccessibleDocRow[]>(`${this.apiUrl}/view/production`).pipe(
      map(rows => rows.map(r => ({
        documento_nombre:   r.titulo,
        documento_estado:   r.estado,
        primer_usuario:     r.creador_nombre,
        fecha_creacion:     r.fecha_creacion,
        unidad_nombre:      r.unidad_nombre,
        categoria_nombre:   r.categoria_nombre2  || 'Sin categoría',
        firmas_obtenidas:   r.firmas_obtenidas,
        firmas_requeridas:  r.firmas_requeridas,
      } satisfies VDocumentModel)))
    );
  }
}
