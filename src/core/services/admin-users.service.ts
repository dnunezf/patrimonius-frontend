import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { map, Observable } from 'rxjs';

export type EditorPermission = 'EDIT' | 'SIGN';

// + Add rolIds to the DTO and AdminUser so TS lets us use them.

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
  // NEW (the backend already returns these if agregaste el GROUP_CONCAT):
  rolIds?: number[];
  roles?: string[];
}

export interface UpsertUserDto {
  nombre: string;
  apellido1: string;
  apellido2?: string;
  email: string;
  // keep primary role for backward-compat
  rolId: number;
  // NEW: all roles selected in the multi-select
  rolIds: number[];
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

  /** Create: normalize to always send rolIds[] (and keep rolId for backward compat) */
  create(body: UpsertUserDto): Observable<AdminUser> {
    const payload: any = {
      ...body,
      rolIds:
        Array.isArray(body.rolIds) && body.rolIds.length
          ? body.rolIds
          : [body.rolId],
      rolId:
        body.rolId ?? (Array.isArray(body.rolIds) ? body.rolIds[0] : undefined),
    };
    return this.http.post<AdminUser>(`${this.api}/users`, payload);
  }

  /** Update: accepts editorPermissions or permisosEditor and handles multi-role */
  update(
    id: number,
    body: Partial<UpsertUserDto> | { permisosEditor: EditorPermission[] }
  ): Observable<AdminUser> {
    let payload: any = body;

    if ((body as Partial<UpsertUserDto>).editorPermissions) {
      payload = {
        ...payload,
        permisosEditor: (body as Partial<UpsertUserDto>).editorPermissions!,
      };
    }
    if (
      (body as Partial<UpsertUserDto>).rolIds ||
      (body as Partial<UpsertUserDto>).rolId != null
    ) {
      const ids =
        (body as Partial<UpsertUserDto>).rolIds &&
        (body as Partial<UpsertUserDto>).rolIds!.length
          ? (body as Partial<UpsertUserDto>).rolIds
          : (body as Partial<UpsertUserDto>).rolId != null
          ? [(body as Partial<UpsertUserDto>).rolId!]
          : undefined;
      if (ids) payload = { ...payload, rolIds: ids, rolId: ids[0] };
    }

    return this.http.patch<AdminUser>(`${this.api}/users/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/users/${id}`);
  }

  listEmails(): Observable<string[]> {
    return this.list().pipe(
      map((users) => Array.from(new Set(users.map((u) => u.email))).sort())
    );
  }
}
