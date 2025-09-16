import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export type EditorPermission = 'EDIT' | 'SIGN';

export interface AdminUser {
  id: number;
  nombre: string;
  apellido1: string;
  apellido2?: string;
  email: string;
  rol: string;
  rolId: number;
  unidad: string;
  unidadId: number;
  editorPermissions?: EditorPermission[];
}

export interface UpsertUserDto {
  nombre: string;
  apellido1: string;
  apellido2?: string;
  email: string;
  rolId: number;
  unidadId: number;
  editorPermissions?: EditorPermission[];
}

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  list(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.api}/admin/users`);
  }

  create(body: UpsertUserDto): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.api}/admin/users`, body);
  }

  update(id: number, body: Partial<UpsertUserDto>): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.api}/admin/users/${id}`, body);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/admin/users/${id}`);
  }
}
