import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PlantillaService {
  private apiUrl = `${environment.apiUrl}/plantillas`; // Usa la URL de tu servidor backend

  constructor(private http: HttpClient) {}

  // Obtener todas las plantillas disponibles
  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}
