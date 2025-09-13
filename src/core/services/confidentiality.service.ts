import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export type ConfLevel = 'PUBLIC' | 'INTERNAL' | 'HIGH' | 'RESTRICTED';
export type Action = 'VIEW' | 'EDIT' | 'SIGN';

export interface ConfUserEntry {
  userId: number;
  actions: Action[];
}
export interface ConfRoleEntry {
  roleId: number;
  actions: Action[];
}
export interface ConfDto {
  level: ConfLevel;
  users: ConfUserEntry[];
  roles: ConfRoleEntry[];
}
export interface ConfConfig extends ConfDto {
  documentId: number;
  title?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfidentialityService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getConfig(docId: number): Observable<ConfConfig> {
    return this.http.get<ConfConfig>(
      `${this.base}/admin/confidentiality/docs/${docId}`
    );
  }

  setConfig(docId: number, dto: ConfDto): Observable<ConfConfig> {
    return this.http.put<ConfConfig>(
      `${this.base}/admin/confidentiality/docs/${docId}`,
      dto
    );
  }

  checkAccess(documentId: number, action: Action) {
    return this.http.post<{
      allowed: boolean;
      level: ConfLevel;
      reason: string;
    }>(`${this.base}/access/check`, { documentId, action });
  }
}
