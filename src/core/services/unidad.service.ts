import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export type OrgUnit = { id: number; name: string; description?: string };

@Injectable({ providedIn: 'root' })
export class UnidadService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/admin`;

  list(): Observable<OrgUnit[]> {
    return this.http.get<OrgUnit[]>(`${this.api}/units`);
  }
}
