import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PlantillaModel {
  id: number;
  nombre: string;
  descripcion: string;
  version: string;
  ruta_archivo: string;
}

@Injectable({ providedIn: 'root' })
export class PlantillaService {
  private api = `${environment.api}/plantillas`;

  constructor(private http: HttpClient) {}

  listar(): Observable<PlantillaModel[]> {
    return this.http.get<PlantillaModel[]>(this.api);
  }
}
