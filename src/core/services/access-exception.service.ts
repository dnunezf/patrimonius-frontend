import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type ExceptionPermission = 'VIEW' | 'EDIT' | 'SIGN';

export type ApplyExceptionDto = {
  userId: number;
  documentId: number;
  permissions: ExceptionPermission[];
  reason: string;
};

export type ExceptionRow = {
  userId: number;
  documentId: number;

  // user
  user?: string;
  email?: string;

  // document
  titulo?: string;
  numero_serie?: string;

  // category/state
  categoria?: string | null;
  estado?: string | null;

  // perms/reason/date
  permissions?: ExceptionPermission[] | string; // backend puede venir string
  reason?: string | null;
  motive?: string | null;
  descripcion?: string | null;

  // IMPORTANT: fecha real desde backend
  created_at?: string; // o fecha_creacion según tu backend
};

export type ExceptionsPage = {
  items: ExceptionRow[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

@Injectable({ providedIn: 'root' })
export class AccessExceptionService {
  private rolesUrl = `${environment.apiUrl}/admin/roles`;
  private usersUrl = `${environment.apiUrl}/admin/users`;
  /** Solo documentos en CREACION / EDICION (admin). */
  private documentsUrl = `${environment.apiUrl}/permissions/exceptions/documentos-elegibles`;
  private exceptionsUrl = `${environment.apiUrl}/permissions/exceptions`;

  constructor(private http: HttpClient) {}

  getRoles(): Observable<any[]> {
    return this.http.get<any[]>(this.rolesUrl);
  }

  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(this.usersUrl);
  }

  getDocuments(): Observable<any[]> {
    return this.http.get<any[]>(this.documentsUrl);
  }

  // ✅ HU-005 API (paginada + filtros)
  listExceptions(params: {
    page: number;
    pageSize: number;
    userId?: number;
    categoryId?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<ExceptionsPage> {
    let httpParams = new HttpParams();

    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && `${v}`.trim() !== '') {
        httpParams = httpParams.set(k, String(v));
      }
    });

    return this.http.get<ExceptionsPage>(this.exceptionsUrl, { params: httpParams });
  }

  applyException(dto: ApplyExceptionDto): Observable<any> {
    return this.http.post<any>(this.exceptionsUrl, dto);
  }

  deleteException(userId: number, documentId: number, reason?: string): Observable<void> {
    return this.http.request<void>('delete', this.exceptionsUrl, {
      body: { userId, documentId, reason }
    });
  }
}
