// src/app/core/document.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface DocumentoPlazoRow {
  id: number;
  titulo: string;
  estado: string;
  plazo_valor: number | null;
  plazo_unidad: 'DIAS' | 'MESES' | 'ANIOS' | null;
  plazo_tipo: 'ADMINISTRATIVO' | 'LEGAL' | 'HISTORICO' | null;
  fecha_inicio_conservacion: string | null;
  fecha_vencimiento: string | null;
  estado_conservacion: 'VIGENTE' | 'PROXIMO_A_VENCER' | 'VENCIDO' | null;
  plazo_asignado_por: number | null;
  plazo_asignado_en: string | null;
  asignado_por_correo?: string | null;
}

export interface AsignarPlazoBody {
  plazo_valor: number;
  plazo_unidad: 'DIAS' | 'MESES' | 'ANIOS';
  plazo_tipo: 'ADMINISTRATIVO' | 'LEGAL' | 'HISTORICO';
  fecha_inicio_conservacion: string;
}
/**
 * Generic document model used by legacy/general document screens.
 */
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

/**
 * View-model row used by the production dashboard.
 */
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

/**
 * Raw row returned by the accessible-documents backend view.
 */
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

/**
 * Minimal version row.
 */
export type VersionDoc = {
  id: number;
  fecha: string;
  nombre_versionado?: string | null;
};

/**
 * Version list row used by the editor history panel.
 */
export interface DocVersionRow {
  id: number;
  fecha: string;
  nombre_versionado?: string | null;
  usuario?: string | null;
  email?: string | null;
}

/**
 * Access-level values used by edition metadata.
 */
export type MetadataAccessLevel = 'PUBLIC' | 'INTERNAL' | 'HIGH' | 'RESTRICTED';

/**
 * Metadata contract used by the redesigned edition metadata dialog.
 *
 * automatic:
 * - identifier
 * - size
 * - producer unit (resolved automatically by backend)
 * - creation/modification/approval audit fields
 * - software application/version
 *
 * manual:
 * - document type
 * - title
 * - keywords
 * - access level
 */
export interface DocumentMetadata {
  automatic: {
    identifier: string | null;
    sizeBytes: number | null;
    producerUnitId: number | null;
    producerUnitName: string | null;
    creationResponsible: string | null;
    createdAt: string | null;
    modificationResponsible: string | null;
    modifiedAt: string | null;
    approvalResponsible: string | null;
    approvedAt: string | null;
    softwareApplication: string | null;
  };
  manual: {
    documentType: string | null;
    title: string | null;
    keywords: string[];
    accessLevel: MetadataAccessLevel | null;
  };
}

/**
 * Response returned when a signed PDF is confirmed/uploaded.
 */
export interface ConfirmSignatureResponse {
  ok?: boolean;
  documento_id: number;
  estado?: string;
  firmas_obtenidas?: number;
  firmas_requeridas?: number;
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  /** Base API URL configured per environment. */
  private readonly api = environment.api;

  /** Base endpoint for document routes. */
  private readonly docsApi = `${this.api}/documentos`;

  constructor(private readonly http: HttpClient) {}

  // =========================================================
  // Users / signers
  // =========================================================

  /**
   * Returns the admin user list, used by the signer-selection flow.
   */
  listUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/admin/users`);
  }

  // =========================================================
  // Legacy / generic document endpoints
  // =========================================================

  /**
   * Returns all documents from the generic legacy endpoint.
   */
  getAll(): Observable<DocumentModel[]> {
    return this.http.get<DocumentModel[]>(`${this.api}/documents`);
  }

  /**
   * Returns a single document from the generic legacy endpoint.
   */
  getById(id: string): Observable<DocumentModel> {
    return this.http.get<DocumentModel>(`${this.api}/documents/${id}`);
  }

  /**
   * Creates a document using the generic legacy endpoint.
   */
  create(document: DocumentModel): Observable<DocumentModel> {
    return this.http.post<DocumentModel>(`${this.api}/documents`, document);
  }

  /**
   * Updates a document using the generic legacy endpoint.
   */
  update(id: string, document: DocumentModel): Observable<DocumentModel> {
    return this.http.put<DocumentModel>(
      `${this.api}/documents/${id}`,
      document,
    );
  }

  /**
   * Deletes a document using the generic legacy endpoint.
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/documents/${id}`);
  }

  // =========================================================
  // Dashboard / accessible documents
  // =========================================================

  /**
   * Returns documents visible to the authenticated user and maps them
   * into the dashboard-friendly view model.
   */
  getDocumentsFromProduction(): Observable<VDocumentModel[]> {
    return this.http
      .get<AccessibleDocRow[]>(`${this.api}/view/production`)
      .pipe(
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
              }) satisfies VDocumentModel,
          ),
        ),
      );
  }

  // =========================================================
  // Draft / collaboration
  // =========================================================

  /**
   * Creates a new draft from a template.
   */
  crearDesdePlantilla(body: {
    plantilla_id: number;
    titulo: string;
    categoria_id?: number | null;
    confid_level?: MetadataAccessLevel;
  }): Observable<{ documento_id: number; numero_serie: string }> {
    return this.http.post<{ documento_id: number; numero_serie: string }>(
      `${this.api}/documentos/crear-desde-plantilla`,
      body,
    );
  }

  /**
   * Returns the latest saved version of a document.
   */
  ultimaVersion(id: number): Observable<{ id: number; fecha: string } | null> {
    return this.http.get<{ id: number; fecha: string } | null>(
      `${this.api}/documentos/${id}/version/latest`,
    );
  }

  /**
   * Saves collaborative editor content against a base version.
   */
  guardarColab(
    id: number,
    contenido: string,
    base_version_id: number,
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

  /**
   * Touches/refreshes the current collaborative session.
   */
  touchSession(id: number): Observable<unknown> {
    return this.http.post(`${this.api}/documentos/${id}/sessions`, {});
  }

  /**
   * Lists active collaborative sessions for a document.
   */
  listSession(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/documentos/${id}/sessions`);
  }

  /**
   * Ends the current user's collaborative session.
   */
  endSession(id: number): Observable<unknown> {
    return this.http.delete(`${this.api}/documentos/${id}/sessions`);
  }

  // =========================================================
  // Comments
  // =========================================================

  /**
   * Lists comments for a document.
   */
  listarComentarios(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/documentos/${id}/comentarios`);
  }

  /**
   * Adds a new comment to a document.
   */
  agregarComentario(id: number, descripcion: string): Observable<any[]> {
    return this.http.post<any[]>(`${this.api}/documentos/${id}/comentarios`, {
      descripcion,
    });
  }

  /**
   * Marks a comment as resolved.
   */
  marcarComentarioResuelto(id: number): Observable<any[]> {
    return this.http.patch<any[]>(`${this.api}/comentarios/${id}/resolver`, {});
  }

  // =========================================================
  // Editor content
  // =========================================================

  /**
   * Returns the current editor content and version information.
   */
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

  // =========================================================
  // Versions (HU-010)
  // =========================================================

  /**
   * Returns the version list for a document.
   * A fallback endpoint is preserved for compatibility.
   */
  listVersions(documentId: number): Observable<DocVersionRow[]> {
    const url1 = `${this.api}/documentos/${documentId}/versiones`;
    const url2 = `${this.api}/documentos/${documentId}/versions`;

    return this.http.get<any>(url1).pipe(
      catchError(() => this.http.get<any>(url2)),
      map((raw) => {
        const arr: any[] = Array.isArray(raw)
          ? raw
          : (raw?.items ?? raw?.rows ?? []);
        return (arr || []) as DocVersionRow[];
      }),
    );
  }

  /**
   * Restores a previous document version.
   */
  restoreVersion(
    documentId: number,
    versionId: number,
    motivo: string,
  ): Observable<{
    newVersionId: number;
    html: string;
    nombre_versionado: string | null;
  }> {
    const url = `${this.api}/documentos/${documentId}/restaurar-version/${versionId}`;

    return this.http.post<any>(url, { motivo }).pipe(
      map((res) => ({
        newVersionId: res?.newVersionId ?? res?.version_restaurada_id ?? 0,
        html: res?.html ?? res?.contenido ?? '',
        nombre_versionado: res?.nombre_versionado ?? null,
      })),
    );
  }

  // =========================================================
  // Metadata (HU-011 / HU-012 redesigned for edition)
  // =========================================================

  /**
   * Returns the combined metadata structure for the edition dialog.
   *
   * Notes:
   * - Producer unit is automatic and comes from the backend.
   * - Size is preserved as an automatic field.
   */
  getMetadata(id: number): Observable<DocumentMetadata> {
    return this.http.get<DocumentMetadata>(
      `${this.api}/documentos/${id}/metadata`,
    );
  }

  /**
   * Saves manual edition metadata.
   *
   * Producer unit is NOT sent here because it is resolved automatically
   * by the backend from the document/user context.
   */
  saveDescriptiveMetadata(
    id: number,
    body: {
      documentType: string;
      title: string;
      keywords: string[] | string;
      accessLevel: MetadataAccessLevel;
    },
  ): Observable<{ ok: true }> {
    return this.http.put<{ ok: true }>(
      `${this.api}/documentos/${id}/metadata/descriptive`,
      body,
    );
  }

  // =========================================================
  // Signature request (HU-017)
  // =========================================================

  /**
   * Sends a document to the signature flow and assigns signers.
   */
  prepareForSignature(
    id: number,
    body?: { firmantesIds?: number[]; fecha_limite?: string | null },
  ): Observable<{
    ok?: boolean;
    documento_id: number;
    numero_serie_oficial: string;
    firmantes?: number[];
    fecha_limite?: string | null;
    estado?: string;
  }> {
    return this.http.put<{
      ok?: boolean;
      documento_id: number;
      numero_serie_oficial: string;
      firmantes?: number[];
      fecha_limite?: string | null;
      estado?: string;
    }>(`${this.api}/documentos/${id}/preparar-firma`, body ?? {});
  }

  // =========================================================
  // Signature flow (HU-018)
  // =========================================================

  /**
   * Returns whether the current user can sign the document and why.
   */
  getSignatureInfo(id: number): Observable<{
    documento_id: number;
    titulo: string;
    estado: string;
    firmas_requeridas: number;
    firmas_obtenidas: number;
    ya_firmo: boolean;
    puede_firmar: boolean;
    motivo?: string | null;
  }> {
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

  /**
   * Returns the current signed PDF.
   */
  getCurrentSignedPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/documentos/${id}/firma/pdf-actual`, {
      responseType: 'blob',
    });
  }

  /**
   * Downloads the PDF version prepared for signing.
   */
  downloadPdfForSignature(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/documentos/${id}/firma/descargar/pdf`, {
      responseType: 'blob',
    });
  }

  /**
   * Downloads the DOCX version prepared for signing.
   */
  downloadDocxForSignature(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/documentos/${id}/firma/descargar/docx`, {
      responseType: 'blob',
    });
  }

  /**
   * Uploads and confirms a signed PDF for a document.
   */
  confirmSignature(
    id: number,
    file: File,
  ): Observable<ConfirmSignatureResponse> {
    const fd = new FormData();
    fd.append('file', file);

    return this.http.post<ConfirmSignatureResponse>(
      `${this.api}/documentos/${id}/firma/confirmar`,
      fd,
    );
  }

  // =========================================================
  // Legacy helpers still used by some editor paths
  // =========================================================

  /**
   * Builds the WebSocket URL for collaborative editing.
   */
  wsUrl(docId: number): string {
    const wsBase = (environment as any).ws ?? 'ws://localhost:1234';
    return `${wsBase}?doc=${docId}`;
  }

  /**
   * Creates a draft using a legacy helper endpoint.
   */
  createDraft(
    titulo: string,
    plantillaId?: number,
  ): Observable<{ id: number; numero_borrador: number }> {
    const body: any = { titulo };
    if (plantillaId != null) body.plantillaId = plantillaId;

    return this.http.post<{ id: number; numero_borrador: number }>(
      this.docsApi,
      body,
    );
  }

  /**
   * Imports a DOCX file and returns generated HTML.
   */
  importDocx(file: File): Observable<{ html: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ html: string }>(`${this.docsApi}/import-docx`, fd);
  }

  /**
   * Saves a checkpoint snapshot through the legacy endpoint.
   */
  checkpoint(id: number, snapshot: any): Observable<void> {
    return this.http.post<void>(`${this.docsApi}/${id}/checkpoint`, {
      snapshot,
    });
  }

  /**
   * Approves a document through the legacy endpoint.
   */
  approve(id: number, snapshot: any): Observable<{ codigo_oficial: string }> {
    return this.http.post<{ codigo_oficial: string }>(
      `${this.docsApi}/${id}/aprobar`,
      { snapshot },
    );
  }

  // =========================================================
  // Attachments
  // =========================================================

  /**
   * Lists attachments for a document.
   */
  listAnexos(documentId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/documentos/${documentId}/anexos`);
  }

  /**
   * Uploads one attachment to a document.
   */
  uploadAnexo(
    documentId: number,
    file: File,
    descripcion?: string,
  ): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);

    if (descripcion != null && descripcion !== '') {
      fd.append('descripcion', descripcion);
    }

    return this.http.post<any>(
      `${this.api}/documentos/${documentId}/anexos`,
      fd,
    );
  }

  /**
   * Downloads one attachment file.
   *
   * Note:
   * This matches the route currently used in the frontend.
   * If your backend serves a different attachment-download route,
   * update it here in one place.
   */
  downloadAnexo(documentId: number, anexoId: number): Observable<Blob> {
    return this.http.get(
      `${this.api}/documentos/${documentId}/anexos/${anexoId}/descargar`,
      { responseType: 'blob' },
    );
  }

  /**
   * Deletes an attachment from a document.
   */
  deleteAnexo(documentId: number, anexoId: number): Observable<any> {
    return this.http.delete<any>(
      `${this.api}/documentos/${documentId}/anexos/${anexoId}`,
    );
  }

  // =========================================================
  // Gestión de plazos de conservación
  // =========================================================

  listarPlazos(params?: {
    estado_conservacion?: string;
    plazo_tipo?: string;
    texto?: string;
  }): Observable<DocumentoPlazoRow[]> {
    let httpParams = new HttpParams();

    if (params?.estado_conservacion) {
      httpParams = httpParams.set(
        'estado_conservacion',
        params.estado_conservacion
      );
    }

    if (params?.plazo_tipo) {
      httpParams = httpParams.set('plazo_tipo', params.plazo_tipo);
    }

    if (params?.texto) {
      httpParams = httpParams.set('texto', params.texto);
    }

    return this.http.get<DocumentoPlazoRow[]>(
      `${this.api}/gestion-plazos`,
      { params: httpParams }
    );
  }

  asignarPlazo(
    documentoId: number,
    body: AsignarPlazoBody
  ): Observable<any> {
    return this.http.post(
      `${this.api}/gestion-plazos/${documentoId}/asignar`,
      body
    );
  }

  listarProximosAVencer(days = 30): Observable<DocumentoPlazoRow[]> {
    const params = new HttpParams().set('days', days.toString());

    return this.http.get<DocumentoPlazoRow[]>(
      `${this.api}/gestion-plazos/proximos`,
      { params }
    );
  }

  listarVencidos(): Observable<DocumentoPlazoRow[]> {
    return this.http.get<DocumentoPlazoRow[]>(
      `${this.api}/gestion-plazos/vencidos`
    );
  }

  revisarVencimientos(days = 30): Observable<any> {
    return this.http.post(
      `${this.api}/gestion-plazos/revisar-vencimientos`,
      { days }
    );
  }
}
