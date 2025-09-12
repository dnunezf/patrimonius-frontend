import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AccessExceptionService {
  private rolUrl = `${environment.apiUrl}/rol/rol`;
  private usersUrl = `${environment.apiUrl}/admin/users`;
  private statesUrl = `${environment.apiUrl}/documentos/estados`;

  constructor(private http: HttpClient) {}

  // Obtener roles desde el backend
  getRoles(): Observable<string[]> {
    return this.http.get<string[]>(this.rolUrl);
  }
  // Obtener usuarios desde el backend
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(this.usersUrl);
  }
  // Obtener estados desde el backend
  // getStates(): Observable<string[]> {
  //   return this.http.get<string[]>(this.statesUrl);
  // }
}
