// src/app/features/admin/users/admin-users.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { map, Observable } from 'rxjs';

export type EditorPermission = 'EDIT' | 'SIGN';
export type Perm = EditorPermission;

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
  rolIds?: number[];
  roles?: string[];
}

export interface UpsertUserDto {
  nombre: string;
  apellido1: string;
  apellido2?: string;
  email: string;
  rolId: number; 
  rolIds: number[];
  unidadId: number;
  editorPermissions?: EditorPermission[]; 
}

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/admin`;

  list(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.api}/users`);
  }

  /** Create user including optional editorPermissions. */
  create(body: UpsertUserDto): Observable<AdminUser> {
    if (!body) throw new Error('AdminUsersService.create: body is required');

    const payload: any = {
      nombre: body.nombre?.trim(),
      apellido1: body.apellido1?.trim(),
      apellido2: body.apellido2?.trim() || null,
      email: body.email?.trim(),
      unidadId: Number(body.unidadId),
      rolIds: (Array.isArray(body.rolIds) && body.rolIds.length
        ? body.rolIds
        : [body.rolId]
      )
        .map((n) => Number(n))
        .filter((n) => !Number.isNaN(n)),
      rolId: body.rolId ?? Number((body.rolIds || [])[0]),
    };

    // pass editorPermissions if provided and valid
    const perms = Array.isArray(body.editorPermissions)
      ? Array.from(
          new Set(
            body.editorPermissions.filter((p) => p === 'EDIT' || p === 'SIGN')
          )
        )
      : [];
    if (perms.length) payload.editorPermissions = perms;

    return this.http
      .post<AdminUser | { user: AdminUser }>(`${this.api}/users`, payload)
      .pipe(map((r: any) => (r?.user ?? r) as AdminUser));
  }

  /**
   * Update user data/roles.
   * Also accepts `{ permisosEditor: Perm[] }` for compatibility.
   */
  update(
    id: number,
    body: Partial<UpsertUserDto> | { permisosEditor: Perm[] }
  ): Observable<AdminUser> {
    if (!body) throw new Error('AdminUsersService.update: body is required');

    // legacy path
    if ('permisosEditor' in body) {
      const perms = Array.isArray(body.permisosEditor)
        ? Array.from(
            new Set(
              body.permisosEditor.filter((p) => p === 'EDIT' || p === 'SIGN')
            )
          )
        : [];
      return this.http.patch<AdminUser>(`${this.api}/users/${id}`, {
        permisosEditor: perms,
      });
    }

    const b = body as Partial<UpsertUserDto>;
    let payload: any = {
      ...(b.nombre != null ? { nombre: b.nombre.trim() } : {}),
      ...(b.apellido1 != null ? { apellido1: b.apellido1.trim() } : {}),
      ...(b.apellido2 != null
        ? { apellido2: (b.apellido2 || '').trim() || null }
        : {}),
      ...(b.email != null ? { email: b.email.trim() } : {}),
      ...(b.unidadId != null ? { unidadId: Number(b.unidadId) } : {}),
    };

    // roles
    const hasRolIds = Array.isArray(b.rolIds) && b.rolIds.length > 0;
    const hasRolId = b.rolId != null;
    if (hasRolIds || hasRolId) {
      const ids = hasRolIds ? b.rolIds! : [b.rolId!];
      payload = {
        ...payload,
        rolIds: ids.map((n) => Number(n)).filter((n) => !Number.isNaN(n)),
        rolId: Number(ids[0]),
      };
    }

    // editorPermissions 
    if (Array.isArray(b.editorPermissions)) {
      const perms = Array.from(
        new Set(b.editorPermissions.filter((p) => p === 'EDIT' || p === 'SIGN'))
      );
      payload.editorPermissions = perms; 
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
