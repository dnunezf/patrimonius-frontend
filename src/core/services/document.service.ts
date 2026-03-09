// src/app/core/document.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { catchError } from 'rxjs/operators';

export interface DocumentModel {
  id: string;
  titulo: string;
  numero_serie: string;
  estado: 'borrador' | 'firmado-parcial' | 'firmado-completo' | 'archivado';
  unidad?: { id: string; nombre: string; descripcion: string };
  usuario_id: string;
  categoria?: { id: string; nombre: string; descripcion: string };
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

export interface DocumentMetadata {
  technical: {
    mimeType: string | null;
    fileExt: string | null;
    sizeBytes: number | null;
    createdAt: string | null;
    updatedAt: string | null;
    contentHash: string | null;
    storageUri: string | null;
    accessLevel: string | null;
    software: string | null;

    authorName?: string | null;
    responsibleUnitName?: string | null;
    documentCode?: string | null;
  };
  descriptive: {
    title: string | null;
    author: string | null;
    responsibleUnitId: number | null;
    keywords: string[];
    preliminaryClass: string | null;
    classificationCode: string | null;
    retentionYears: number | null;
    pages?: number | null;
  };
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private api = environment.api;
  private docsApi = `${this.api}/documentos`;

  constructor(private http: HttpClient) {}

  // =========================
  // ✅ NUEVO: usuarios para firmantes
  // =========================
  listUsers() {
    return this.http.get<any[]>(`${this.api}/admin/users`);
  }

  // ========== Existing endpoints ==========
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

  // Documentos accesibles (lo que alimenta el dashboard)
  getDocumentsFromProduction(): Observable<VDocumentModel[]> {
    return this.http.get<AccessibleDocRow[]>(`${this.api}/view/production`).pipe(
      map((rows) =>
        rows.map(
          (r) =>
            ({
              id: r.documento_id,
              documento_nombre: r.titulo,
              documento_estado: r.estado,
              primer_usuario: r.creador_nombre,
              fecha_creacion: r.fecha_creacion,
              unidad_nombre: r.unidad_nombre,
              categoria_nombre: r.categoria_nombre || 'Sin categoría',
              firmas_obtenidas: r.firmas_obtenidas,
              firmas_requeridas: r.firmas_requeridas,
            } satisfies VDocumentModel)
        )
      )
    );
  }

  // ========== Draft / collaboration ==========
  crearDesdePlantilla(body: {
    plantilla_id: number;
    titulo: string;
    categoria_id?: number | null;
    confid_level?: 'PUBLIC' | 'INTERNAL' | 'HIGH' | 'RESTRICTED';
  }): Observable<{ documento_id: number; numero_serie: string }> {
    return this.http.post<{ documento_id: number; numero_serie: string }>(
      `${this.api}/documentos/crear-desde-plantilla`,
      body
    );
  }

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
    }>(`${this.api}/documentos/${id}/colab-guardar`, {
      contenido,
      base_version_id,
    });
  }

  touchSession(id: number) {
    return this.http.post(`${this.api}/documentos/${id}/sessions`, {});
  }

  listSession(id: number) {
    return this.http.get<any[]>(`${this.api}/documentos/${id}/sessions`);
  }

  endSession(id: number) {
    return this.http.delete(`${this.api}/documentos/${id}/sessions`);
  }

  // ========== Comentarios ==========
  listarComentarios(id: number) {
    return this.http.get<any[]>(`${this.api}/documentos/${id}/comentarios`);
  }

  agregarComentario(id: number, descripcion: string) {
    return this.http.post<any[]>(`${this.api}/documentos/${id}/comentarios`, {
      descripcion,
    });
  }

  marcarComentarioResuelto(id: number) {
    return this.http.patch<any[]>(`${this.api}/comentarios/${id}/resolver`, {});
  }

  // ========== Contenido ==========
  getContenido(id: number): Observable<{
    documento_id: number;
    titulo: string;
    estado: string;
    contenido: string;
    latest_version_id: number;
    has_signed_pdf?: boolean;
    signed_pdf_url?: string | null;
    prefer_signed_pdf_view?: boolean;
  }> {
    return this.http.get<{
      documento_id: number;
      titulo: string;
      estado: string;
      contenido: string;
      latest_version_id: number;
      has_signed_pdf?: boolean;
      signed_pdf_url?: string | null;
      prefer_signed_pdf_view?: boolean;
    }>(`${this.api}/documentos/${id}/contenido`);
  }

  // ========== HU-010 Versiones ==========
  listVersions(documentId: number) {
    const url1 = `${this.api}/documentos/${documentId}/versiones`;
    const url2 = `${this.api}/documentos/${documentId}/versions`;

    return this.http.get<any>(url1).pipe(
      catchError(() => this.http.get<any>(url2)),
      map((raw) => {
        const arr: any[] = Array.isArray(raw)
          ? raw
          : raw?.items ?? raw?.rows ?? [];
        return (arr || []) as DocVersionRow[];
      })
    );
  }

  restoreVersion(documentId: number, versionId: number, motivo: string) {
    const url = `${this.api}/documentos/${documentId}/restaurar-version/${versionId}`;
    return this.http.post<any>(url, { motivo }).pipe(
      map((res) => ({
        newVersionId: res?.newVersionId ?? res?.version_restaurada_id ?? 0,
        html: res?.html ?? res?.contenido ?? '',
        nombre_versionado: res?.nombre_versionado ?? null,
      }))
    );
  }

  // ========== HU-011/012 metadata ==========
  getMetadata(id: number) {
    return this.http.get<DocumentMetadata>(`${this.api}/documentos/${id}/metadata`);
  }

  saveDescriptiveMetadata(
    id: number,
    body: {
      title: string;
      keywords: string[] | string;
      preliminaryClass: string;
      classificationCode: string;
    }
  ) {
    return this.http.put<{ ok: true }>(
      `${this.api}/documentos/${id}/metadata/descriptive`,
      body
    );
  }

  // =========================
  // HU-017: Solicitar firma
  // =========================
  prepareForSignature(
    id: number,
    body?: { firmantesIds?: number[]; fecha_limite?: string | null }
  ) {
    return this.http.put<{
      ok?: boolean;
      documento_id: number;
      numero_serie_oficial: string;
      firmantes?: number[];
      fecha_limite?: string | null;
      estado?: string;
    }>(`${this.api}/documentos/${id}/preparar-firma`, body ?? {});
  }

  // =========================
  // HU-018: Firma (descarga + upload)
  // =========================
  getSignatureInfo(id: number) {
    return this.http.get<{
      documento_id: number;
      titulo: string;
      estado: string;
      firmas_requeridas: number;
      firmas_obtenidas: number;
      ya_firmo: boolean;
      puede_firmar: boolean;
      motivo?: string | null;
    }>(`${this.api}/documentos/${id}/firma/info`);
  }

  // ✅ NUEVO: obtener PDF firmado actual con auth
  getCurrentSignedPdf(id: number) {
    return this.http.get(`${this.api}/documentos/${id}/firma/pdf-actual`, {
      responseType: 'blob',
    });
  }

  downloadPdfForSignature(id: number) {
    return this.http.get(`${this.api}/documentos/${id}/firma/descargar/pdf`, {
      responseType: 'blob',
    });
  }

  downloadDocxForSignature(id: number) {
    return this.http.get(`${this.api}/documentos/${id}/firma/descargar/docx`, {
      responseType: 'blob',
    });
  }

  confirmSignature(id: number, file: File) {
    const fd = new FormData();
    fd.append('file', file);

    return this.http.post<{
      ok: boolean;
      documento_id: number;
      estado: string;
      firmas_obtenidas: number;
      firmas_requeridas: number;
    }>(`${this.api}/documentos/${id}/firma/confirmar`, fd);
  }

  // ====== Helpers viejos (si aún los usás en algún lado) ======
  wsUrl(docId: number): string {
    const wsBase = (environment as any).ws ?? 'ws://localhost:1234';
    return `${wsBase}?doc=${docId}`;
  }

  createDraft(
    titulo: string,
    plantillaId?: number
  ): Observable<{ id: number; numero_borrador: number }> {
    const body: any = { titulo };
    if (plantillaId != null) body.plantillaId = plantillaId;
    return this.http.post<{ id: number; numero_borrador: number }>(this.docsApi, body);
  }

  importDocx(file: File): Observable<{ html: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ html: string }>(`${this.docsApi}/import-docx`, fd);
  }

  checkpoint(id: number, snapshot: any): Observable<void> {
    return this.http.post<void>(`${this.docsApi}/${id}/checkpoint`, { snapshot });
  }

  approve(id: number, snapshot: any): Observable<{ codigo_oficial: string }> {
    return this.http.post<{ codigo_oficial: string }>(`${this.docsApi}/${id}/aprobar`, {
      snapshot,
    });
  }

  // =========================
  // 📎 Anexos
  // =========================
  listAnexos(documentId: number) {
    return this.http.get<any[]>(`${this.api}/documentos/${documentId}/anexos`);
  }

  uploadAnexo(documentId: number, file: File, descripcion?: string) {
    const fd = new FormData();
    fd.append('file', file);
    if (descripcion != null && descripcion !== '') {
      fd.append('descripcion', descripcion);
    }

    return this.http.post<any>(`${this.api}/documentos/${documentId}/anexos`, fd);
  }

  downloadAnexo(documentId: number, anexoId: number) {
    return this.http.get(
      `${this.api}/documentos/${documentId}/anexos/${anexoId}/descargar`,
      { responseType: 'blob' }
    );
  }

  deleteAnexo(documentId: number, anexoId: number) {
    return this.http.delete<any>(`${this.api}/documentos/${documentId}/anexos/${anexoId}`);
  }
}
