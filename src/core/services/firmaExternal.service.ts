import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse, HttpParams } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { catchError, throwError } from "rxjs";

export type ExternalVerifyResponse = {
  ok: boolean;
  documento_id: number;
  estado: "VALIDA" | "INVALIDA" | "CADUCADA" | "REVOCADA";
  verificacion_id: number;
  detalle?: {
    reason?: string | null;
    certificate?: any;
  };
};

@Injectable({ providedIn: "root" })
export class FirmaExternalService {
  private baseUrl = environment.apiUrl; // ej: http://localhost:8080

  constructor(private http: HttpClient) {}

  verify(documentoId: number, documentFile: File, certificateFile: File) {
    const form = new FormData();
    form.append("document", documentFile);
    form.append("certificate", certificateFile);

    return this.http
      .post<ExternalVerifyResponse>(
        `${this.baseUrl}/firma/external-signatures/${documentoId}/verify`,
        form
      )
      .pipe(catchError((e) => this.mapError(e)));
  }

  latest(documentoId: number) {
    return this.http
      .get<{ item: any }>(`${this.baseUrl}/firma/external-signatures/${documentoId}/latest`)
      .pipe(catchError((e) => this.mapError(e)));
  }

  history(documentoId: number, limit = 50, offset = 0) {
    const params = new HttpParams()
      .set("limit", String(limit))
      .set("offset", String(offset));

    return this.http
      .get<{ items: any[] }>(`${this.baseUrl}/firma/external-signatures/${documentoId}/history`, { params })
      .pipe(catchError((e) => this.mapError(e)));
  }

  private mapError(err: HttpErrorResponse) {
    const status = err.status || 500;
    const msg =
      (err.error && (err.error.message || err.error.error)) ||
      err.message ||
      "Error verificando firma externa";

    // mensajes más “humanos”
    let friendly = msg;

    if (status === 413) friendly = "Archivo demasiado grande (máx 15MB).";
    if (status === 403) friendly = "No tenés permisos para verificar firma externa.";
    if (status === 401) friendly = "Sesión expirada o token inválido.";
    if (status === 502) friendly = "El validador externo falló. Intentá de nuevo.";

    return throwError(() => ({ status, msg: friendly, raw: err }));
  }
}
