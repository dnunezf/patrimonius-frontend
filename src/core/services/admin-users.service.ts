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
  private api = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  list(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.api}/users`);
  }

  create(body: UpsertUserDto): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.api}/users`, body);
  }

  // ✅ acepta tanto editorPermissions (tipo TS) como permisosEditor (lo que consume el backend)
  update(
    id: number,
    body: Partial<UpsertUserDto> | { permisosEditor: EditorPermission[] }
  ): Observable<AdminUser> {
    let payload: any = body;

    // Si viene con editorPermissions, lo mapeamos a permisosEditor para el backend
    if ((body as Partial<UpsertUserDto>).editorPermissions) {
      const perms = (body as Partial<UpsertUserDto>).editorPermissions!;
      payload = { permisosEditor: perms };
    }

    return this.http.patch<AdminUser>(`${this.api}/users/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/users/${id}`);
  }
}
