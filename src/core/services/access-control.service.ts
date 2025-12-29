import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface DocumentRow {
  id: number;
  code: string;
  title: string;

  unit: string;
  unitId: number;

  status: string;
  categoria?: string | null;
  created_at?: string | null;

  canView: boolean;
  canEdit: boolean;

  // canSign = acción habilitada ahora (depende de estado)
  canSign: boolean;

  // hasSign = permiso asignado (lo que marcás al crear usuario)
  hasSign?: boolean;

  source?: string;
}

export interface AccessControlResponsePaged {
  user: {
    id: number;
    email: string;
    roles: string[];
    unidad: string;
    unidadId: number;

    // útil si querés ver qué columnas detectó el backend
    caps?: { canEdit: boolean; canSign: boolean; source?: string };
  };

  items: DocumentRow[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;

  accessibleCount: number;
}

@Injectable({ providedIn: 'root' })
export class AccessControlService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAccessControl(query: any = {}): Observable<AccessControlResponsePaged> {
    let params = new HttpParams();
    Object.keys(query || {}).forEach((k) => {
      const v = query[k];
      if (v !== null && v !== undefined && v !== '') {
        params = params.set(k, String(v));
      }
    });

    return this.http.get<AccessControlResponsePaged>(
      `${this.api}/documents/control-acceso`,
      { params }
    );
  }
}
