import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

type ApplyExceptionDto = {
  userId: number;
  documentId: number;
  permissions: ('VIEW'|'EDIT'|'SIGN')[];
  reason: string;
};

@Injectable({ providedIn: 'root' })
export class AccessExceptionService {
  private rolesUrl = `${environment.apiUrl}/rol/rol`;
  private usersUrl = `${environment.apiUrl}/admin/users`;
  private documentsUrl = `${environment.apiUrl}/`;
  private exceptionsUrl = `${environment.apiUrl}/permissions/exceptions`;

  constructor(private http: HttpClient) {}

  getRoles(): Observable<string[]> { return this.http.get<string[]>(this.rolesUrl); }
  getUsers(): Observable<any[]> { return this.http.get<any[]>(this.usersUrl); }
  getDocuments(): Observable<any[]> { return this.http.get<any[]>(this.documentsUrl); }

  // HU-005 API
  listExceptions(): Observable<any[]> { return this.http.get<any[]>(this.exceptionsUrl); }
  applyException(dto: ApplyExceptionDto): Observable<any> { return this.http.post<any>(this.exceptionsUrl, dto); }
  deleteException(userId: number, documentId: number, reason?: string): Observable<void> {
    return this.http.request<void>('delete', this.exceptionsUrl, { body: { userId, documentId, reason } });
  }
}
