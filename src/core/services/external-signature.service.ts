// src/app/core/services/external-signature.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export type VerifyStatus = 'VALID' | 'EXPIRED' | 'REVOKED' | 'INVALID';

export interface VerifyResp {
  status: VerifyStatus;
  message?: string;
  signer?: { name?: string; id?: string; issuer?: string };
  signedAt?: string | null;
  certExpiresAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ExternalSignatureService {
  private base = environment.api;

  constructor(private http: HttpClient) {}

  verifyExternal(documentId: number): Observable<VerifyResp> {
    return this.http.post<VerifyResp>(`${this.base}/signatures/verify-external`, {
      documentId
    });
  }

  sendAlert(documentId: number, status: VerifyStatus, reason?: string) {
    return this.http.post<{ ok: boolean }>(`${this.base}/notificacion/alerta-firma-externa`, {
      documentId, status, reason
    });
  }
}
