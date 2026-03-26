import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Notificacion } from '../../app/shared/models/notificacion.model';
import {environment} from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private api = environment.api;
  private baseUrl = `${this.api}/notificacion`;

  constructor(private http: HttpClient) {}

  listMine(opts?: { unreadOnly?: boolean; limit?: number; offset?: number }): Observable<{ items: Notificacion[] }> {
    let params = new HttpParams();
    if (opts?.unreadOnly) params = params.set('unreadOnly', '1');
    if (opts?.limit != null) params = params.set('limit', String(opts.limit));
    if (opts?.offset != null) params = params.set('offset', String(opts.offset));
    return this.http.get<{ items: Notificacion[] }>(`${this.baseUrl}/mine`, { params });
  }

  unreadCount(): Observable<{ unread: number }> {
    return this.http.get<{ unread: number }>(`${this.baseUrl}/mine/unread-count`);
  }

  markRead(id: number): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(`${this.baseUrl}/${id}/read`, {});
  }

  markReadBulk(ids: number[]): Observable<{ ok: boolean; updated: number }> {
    return this.http.patch<{ ok: boolean; updated: number }>(`${this.baseUrl}/read-bulk`, { ids });
  }
}
