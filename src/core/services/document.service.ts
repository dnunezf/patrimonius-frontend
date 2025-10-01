// src/app/core/document.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DocumentModel {
  id: string;
  titulo: string;
  numero_serie: string;
  estado: 'borrador' | 'firmado-parcial' | 'firmado-completo' | 'archivado';
  unidad?: { id: string; nombre: string; descripcion: string; };
  usuario_id: string;
  categoria?: { id: string; nombre: string; descripcion: string; };
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
  firmas_obtenidas: number;
  firmas_requeridas: number;
}

export interface AccessibleDocRow {
  viewer_usuario_id: number;
  documento_id: number;
  numero_serie: string;
  titulo: string;
  estado: string;
  fecha_creacion: string;
  unidad_id: number;
  unidad_nombre: string;
  creador_id: number;
  creador_nombre: string;
  categoria_nombre: string | null;
  firmas_requeridas: number;
  firmas_obtenidas: number;
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private api = environment.api; // ej: http://localhost:3000

  constructor(private http: HttpClient) {}

  // ==== Listados básicos (si los usas) ====
  getAll(): Observable<DocumentModel[]> {
    return this.http.get<DocumentModel[]>(`${this.api}/documents`);
  }
  getById(id: string): Observable<DocumentModel> {
    return this.http.get<DocumentModel>(`${this.api}/documents/${id}`);
  }
  create(document: DocumentModel): Observable<DocumentModel> {
    return this.http.post<DocumentModel>(`${this.api}/documents`, document);
  }
  update(id: string, document: DocumentModel): Observable<DocumentModel> {
    return this.http.put<DocumentModel>(`${this.api}/documents/${id}`, document);
  }
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/documents/${id}`);
  }

  // ==== Vista de producción (dashboard) ====
  getDocumentsFromProduction(): Observable<VDocumentModel[]> {
    return this.http.get<AccessibleDocRow[]>(`${this.api}/view/production`).pipe(
      map(rows =>
        rows.map(r => ({
          documento_nombre:   r.titulo,
          documento_estado:   r.estado,
          primer_usuario:     r.creador_nombre,
          fecha_creacion:     r.fecha_creacion,
          unidad_nombre:      r.unidad_nombre,
          categoria_nombre:   r.categoria_nombre || 'Sin categoría',
          firmas_obtenidas:   r.firmas_obtenidas,
          firmas_requeridas:  r.firmas_requeridas,
        } satisfies VDocumentModel))
      )
    );
  }

  // ==== HU-007: crear desde plantilla ====
  crearDesdePlantilla(body: {
    plantilla_id: number;
    titulo: string;
    categoria_id?: number | null;
    confid_level?: 'PUBLIC'|'INTERNAL'|'HIGH'|'RESTRICTED';
    numero_firmas?: number;
  }): Observable<{ documento_id: number; numero_serie: string }> {
    return this.http.post<{ documento_id: number; numero_serie: string }>(
      `${this.api}/documentos/crear-desde-plantilla`,
      body
    );
  }

  // ==== HU-008: edición colaborativa ====
  ultimaVersion(id: number): Observable<{ id: number; fecha: string } | null> {
    return this.http.get<{ id: number; fecha: string } | null>(
      `${this.api}/documentos/${id}/version/latest`
    );
  }

  guardarColab(id: number, contenido: string, base_version_id: number):
    Observable<{ version_id: number; next_version: number; conflict: boolean }> {
    return this.http.put<{ version_id: number; next_version: number; conflict: boolean }>(
      `${this.api}/documentos/${id}/colab-guardar`,
      { contenido, base_version_id }
    );
  }

  // sesiones (awareness)
  touchSession(id: number)  { return this.http.post(`${this.api}/documentos/${id}/sessions`, {}); }
  listSession(id: number)   { return this.http.get<any[]>(`${this.api}/documentos/${id}/sessions`); }
  endSession(id: number)    { return this.http.delete(`${this.api}/documentos/${id}/sessions`); }

  // ==== HU-016: comentarios ====
  listarComentarios(id: number) {
    return this.http.get<any[]>(`${this.api}/documentos/${id}/comentarios`);
  }
  agregarComentario(id: number, descripcion: string) {
    return this.http.post(`${this.api}/documentos/${id}/comentarios`, { descripcion });
  }
}
