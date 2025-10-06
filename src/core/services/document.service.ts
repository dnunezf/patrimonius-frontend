// src/app/core/document.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {catchError} from 'rxjs/operators';

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
  id: number;
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

export type VersionDoc = {
  id: number;
  fecha: string;
  nombre_versionado?: string | null;
};

export interface DocVersionRow {
  id: number;
  fecha: string;
  nombre_versionado?: string | null;
  usuario?: string | null;
  email?: string | null;
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  /** Base del backend. En local suele ser http://localhost:3000 */
  private api = environment.api;

  /** Base para los endpoints de ESTE mini-flujo (Express con /api/documentos).
   *  Si tu environment.api ya incluye /api, ajusta esto a `${this.api}/documentos`.
   */
  private docsApi = `${this.api}/documentos`;

  constructor(private http: HttpClient) {}

  // ========== ENDPOINTS EXISTENTES (Patrimonius) ==========
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

  getDocumentsFromProduction(): Observable<VDocumentModel[]> {
    return this.http.get<AccessibleDocRow[]>(`${this.api}/view/production`).pipe(
      map(rows =>
        rows.map(r => ({
          id :                 r.documento_id,
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

  // HU-007
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

  // HU-008
  ultimaVersion(id: number): Observable<{ id: number; fecha: string } | null> {
    return this.http.get<{ id: number; fecha: string } | null>(
      `${this.api}/documentos/${id}/version/latest`
    );
  }

  guardarColab(
    id: number,
    contenido: string,
    base_version_id: number
  ): Observable<{
    version_id: number;
    next_version: number;
    conflict: boolean;
    saved?: boolean;
    reason?: 'NO_CHANGES' | string;
    nombre_versionado?: string;
  }> {
    return this.http.put<{
      version_id: number;
      next_version: number;
      conflict: boolean;
      saved?: boolean;
      reason?: 'NO_CHANGES' | string;
      nombre_versionado?: string;
    }>(`${this.api}/documentos/${id}/colab-guardar`, { contenido, base_version_id });
  }


  touchSession(id: number)  { return this.http.post(`${this.api}/documentos/${id}/sessions`, {}); }
  listSession(id: number)   { return this.http.get<any[]>(`${this.api}/documentos/${id}/sessions`); }
  endSession(id: number)    { return this.http.delete(`${this.api}/documentos/${id}/sessions`); }

  listarComentarios(id: number) {
    return this.http.get<any[]>(`${this.api}/documentos/${id}/comentarios`);
  }
  agregarComentario(id: number, descripcion: string) {
    return this.http.post(`${this.api}/documentos/${id}/comentarios`, { descripcion });
  }

  // ========= NUEVOS MÉTODOS para el mini Word colaborativo =========

  /** Crear BORRADOR (Express: POST /api/documentos) */
  createDraft(titulo: string, plantillaId?: number):
    Observable<{ id: number; numero_borrador: number }> {
    const body: any = { titulo };
    if (plantillaId != null) body.plantillaId = plantillaId;
    return this.http.post<{ id: number; numero_borrador: number }>(this.docsApi, body);
  }

  /** Importar .docx -> HTML (Express: POST /api/documentos/import-docx) */
  importDocx(file: File): Observable<{ html: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ html: string }>(`${this.docsApi}/import-docx`, fd);
  }

  /** Guardar checkpoint (Express: POST /api/documentos/:id/checkpoint) */
  checkpoint(id: number, snapshot: any): Observable<void> {
    return this.http.post<void>(`${this.docsApi}/${id}/checkpoint`, { snapshot });
  }

  /** Aprobar (firmar) y obtener código oficial (Express: POST /api/documentos/:id/aprobar) */
  approve(id: number, snapshot: any): Observable<{ codigo_oficial: string }> {
    return this.http.post<{ codigo_oficial: string }>(`${this.docsApi}/${id}/aprobar`, { snapshot });
  }

  /** URL del WebSocket de colaboración (y-websocket) */
  wsUrl(docId: number): string {
    // Si tienes environment.ws, úsalo; si no, default local:
    const wsBase = (environment as any).ws ?? 'ws://localhost:1234';
    return `${wsBase}?doc=${docId}`;
  }

  getContenido(id: number): Observable<{
    documento_id: number;
    titulo: string;
    estado: string;
    contenido: string;
    latest_version_id: number;
  }> {
    return this.http.get<{
      documento_id: number;
      titulo: string;
      estado: string;
      contenido: string;
      latest_version_id: number;
    }>(`${this.api}/documentos/${id}/contenido`);
  }

  /** HU-010: listar versiones de un documento */
  listVersions(documentId: number) {
    // Ajusta el path si tu backend usa otra convención:
    // opciones típicas: /documentos/:id/versiones  | /documentos/:id/versions
    const url1 = `${this.api}/documentos/${documentId}/versiones`;
    const url2 = `${this.api}/documentos/${documentId}/versions`;

    return this.http.get<any>(url1).pipe(
      // si falla url1 prueba url2
      catchError(() => this.http.get<any>(url2)),
      map((raw) => {
        const arr: any[] = Array.isArray(raw) ? raw : (raw?.items ?? raw?.rows ?? []);
        return (arr || []) as DocVersionRow[];
      })
    );
  }

  /** HU-010: restaurar versión */
  // restoreVersion(documentId: number, versionId: number, motivo: string) {
  //   // Ajusta si tu backend usa otro path:
  //   const url1 = `${this.api}/documentos/${documentId}/versiones/${versionId}/restore`;
  //   const url2 = `${this.api}/documentos/${documentId}/versions/${versionId}/restore`;
  //
  //   const body = { motivo };
  //
  //   return this.http.post<any>(url1, body).pipe(
  //     catchError(() => this.http.post<any>(url2, body)),
  //     map((res) => {
  //       // formatea la respuesta esperada por el editor
  //       return {
  //         newVersionId: res?.newVersionId ?? res?.version_id ?? res?.id ?? 0,
  //         html: String(res?.html ?? res?.contenido ?? ''),
  //         nombre_versionado: res?.nombre_versionado ?? null,
  //       };
  //     })
  //   );
  // }
  // src/app/core/document.service.ts
  restoreVersion(documentId: number, versionId: number, motivo: string) {
    const url = `${this.api}/documentos/${documentId}/restaurar-version/${versionId}`;
    return this.http.post<any>(url, { motivo }).pipe(
      map(res => ({
        // tu backend devuelve: { documento_id, version_origen_id, version_restaurada_id, nombre_versionado }
        newVersionId: res?.version_restaurada_id ?? 0,
        html: '', // no lo devuelve el back; el front ya vuelve a pedir el contenido luego
        nombre_versionado: res?.nombre_versionado ?? null,
      }))
    );
  }

}
