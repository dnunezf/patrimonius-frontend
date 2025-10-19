import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface Document {
  code: string;
  title: string;
  unit: string;
  status: string;
  canView: boolean;
  canEdit: boolean;
  canSign: boolean;
}

export interface AccessControlResponse {
  user: {
    email: string;
    roles: string[];
    unidad: string;
  };
  documents: Document[];
  accessibleCount: number;
}

@Injectable({ providedIn: 'root' })
export class AccessControlService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // 🚀 ya no recibe token
  getAccessControl(): Observable<AccessControlResponse> {
    return this.http.get<AccessControlResponse>(`${this.api}/documents/control-acceso`);
  }
}
