// src/app/core/services/catalogos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/* ===================== Tipos ===================== */
export interface Rol {
  idRol: number;
  nombreRol: string;
  descripcion?: string;
}
export interface Unidad {
  id: number;
  nombre: string;
  descripcion?: string;
}
export interface Plantilla {
  id: number;
  nombre: string;
  version: string;
  descripcion?: string;
  ruta_archivo: string;
}

/* Payloads para evitar TS7053 y aceptar ambas claves */
type RolUpsert = { nombreRol?: string; nombre?: string; descripcion?: string | null };
type UnidadUpsert = Partial<Pick<Unidad, 'nombre' | 'descripcion'>>;
type PlantillaUpsert = Partial<Pick<Plantilla, 'nombre' | 'version' | 'descripcion'>>;

@Injectable({ providedIn: 'root' })
export class CatalogosService {
  /* Bases */
  private adminBase = `${environment.apiUrl}/admin`;
  private rolBase = `${this.adminBase}/roles`;
  private unidadBase = `${this.adminBase}/unidades`;
  private plantillaBase = `${environment.apiUrl}/plantillas`;

  constructor(private http: HttpClient) {}

  /* ===================== ROLES ===================== */
  private _roles$ = new BehaviorSubject<Rol[]>([]);
  readonly roles$ = this._roles$.asObservable();
  private _rolesLoaded = false;

  private mapRol = (r: any, i = 0): Rol => {
    // Si el backend devuelve un string (modo legado)
    if (typeof r === 'string') {
      return { idRol: i + 1, nombreRol: r, descripcion: '' };
    }
    // Si devuelve objeto
    return {
      idRol: r?.idRol ?? r?.id ?? i + 1,
      nombreRol: r?.nombreRol ?? r?.nombre ?? '',
      descripcion: r?.descripcion ?? ''
    };
  };


  loadRoles(): void {
    if (this._rolesLoaded) return;
    this._rolesLoaded = true;

    this.http.get<any[]>(this.rolBase).pipe(
      tap(rows => console.log('[GET /admin/roles] crudo:', rows)),
      map(rows => Array.isArray(rows) ? rows : (rows as any)?.data ?? []),
      map((rows: any[]) => rows.map((r: any, i: number) => this.mapRol(r, i))),
      tap(list => console.log('[roles mapeados]', list)),
      tap(list => this._roles$.next(list)),
      catchError(this.handleError)
    ).subscribe();
  }



  getRoles(): Observable<Rol[]> {
    if (!this._rolesLoaded) this.loadRoles();
    return this.roles$;
  }

  createRol(data: RolUpsert): Observable<Rol> {
    const nombre = (data.nombreRol ?? data.nombre ?? '').trim();
    const body = { nombre, descripcion: data.descripcion ?? null };
    return this.http.post<any>(this.rolBase, body).pipe(
      map(r => this.mapRol(r)),
      tap(newRol => this._roles$.next([...this._roles$.value, newRol])),
      catchError(this.handleError)
    );
  }

  updateRol(idRol: number, data: RolUpsert): Observable<Rol> {
    const nombre = (data.nombreRol ?? data.nombre ?? '').trim();
    const body = { nombre, descripcion: data.descripcion ?? null };
    return this.http.patch<any>(`${this.rolBase}/${idRol}`, body).pipe(
      map(r => this.mapRol({ id: idRol, ...r })),
      tap(updated => {
        const next = this._roles$.value.map(x => x.idRol === idRol ? { ...x, ...updated } : x);
        this._roles$.next(next);
      }),
      catchError(this.handleError)
    );
  }

  deleteRol(idRol: number): Observable<void> {
    return this.http.delete<void>(`${this.rolBase}/${idRol}`).pipe(
      tap(() => this._roles$.next(this._roles$.value.filter(x => x.idRol !== idRol))),
      catchError(this.handleError)
    );
  }

  /* ===================== UNIDADES ===================== */
  private _unidades$ = new BehaviorSubject<Unidad[]>([]);
  readonly unidades$ = this._unidades$.asObservable();
  private _unidadesLoaded = false;

  loadUnidades(): void {
    if (this._unidadesLoaded) return;
    this._unidadesLoaded = true;
    this.http.get<Unidad[]>(this.unidadBase).pipe(
      tap(rows => this._unidades$.next(rows ?? [])),
      catchError(this.handleError)
    ).subscribe();
  }

  getUnidades(): Observable<Unidad[]> {
    if (!this._unidadesLoaded) this.loadUnidades();
    return this.unidades$;
  }

  createUnidad(data: UnidadUpsert): Observable<Unidad> {
    return this.http.post<Unidad>(this.unidadBase, data).pipe(
      tap(created => this._unidades$.next([...this._unidades$.value, created])),
      catchError(this.handleError)
    );
  }

  updateUnidad(id: number, data: UnidadUpsert): Observable<Unidad> {
    return this.http.patch<Unidad>(`${this.unidadBase}/${id}`, data).pipe(
      tap(updated => {
        const next = this._unidades$.value.map(u => u.id === id ? { ...u, ...updated } : u);
        this._unidades$.next(next);
      }),
      catchError(this.handleError)
    );
  }

  deleteUnidad(id: number): Observable<void> {
    return this.http.delete<void>(`${this.unidadBase}/${id}`).pipe(
      tap(() => this._unidades$.next(this._unidades$.value.filter(u => u.id !== id))),
      catchError(this.handleError)
    );
  }

  /* ===================== PLANTILLAS ===================== */
  private _plantillas$ = new BehaviorSubject<Plantilla[]>([]);
  readonly plantillas$ = this._plantillas$.asObservable();
  private _plantillasLoaded = false;

  loadPlantillas(): void {
    if (this._plantillasLoaded) return;
    this._plantillasLoaded = true;
    this.http.get<Plantilla[]>(this.plantillaBase).pipe(
      tap(list => this._plantillas$.next(list ?? [])),
      catchError(this.handleError)
    ).subscribe();
  }

  getPlantillas(): Observable<Plantilla[]> {
    if (!this._plantillasLoaded) this.loadPlantillas();
    return this.plantillas$;
  }

  uploadPlantilla(p: { nombre: string; version: string; descripcion?: string; file: File }): Observable<Plantilla> {
    const fd = new FormData();
    fd.append('nombre', p.nombre);
    fd.append('version', p.version);
    if (p.descripcion) fd.append('descripcion', p.descripcion);
    fd.append('archivo', p.file); // backend espera 'archivo' (multer.single('archivo'))
    return this.http.post<Plantilla>(this.plantillaBase, fd).pipe(
      tap(created => this._plantillas$.next([...this._plantillas$.value, created])),
      catchError(this.handleError)
    );
  }

  updatePlantilla(id: number, data: PlantillaUpsert): Observable<Plantilla> {
    return this.http.patch<Plantilla>(`${this.plantillaBase}/${id}`, data).pipe(
      tap(updated => {
        const next = this._plantillas$.value.map(p => p.id === id ? { ...p, ...updated } : p);
        this._plantillas$.next(next);
      }),
      catchError(this.handleError)
    );
  }

  updatePlantillaArchivo(id: number, file: File): Observable<Plantilla> {
    const fd = new FormData();
    fd.append('archivo', file);
    return this.http.patch<Plantilla>(`${this.plantillaBase}/${id}`, fd).pipe(
      tap(updated => {
        const next = this._plantillas$.value.map(p => p.id === id ? { ...p, ...updated } : p);
        this._plantillas$.next(next);
      }),
      catchError(this.handleError)
    );
  }

  deletePlantilla(id: number): Observable<void> {
    return this.http.delete<void>(`${this.plantillaBase}/${id}`).pipe(
      tap(() => this._plantillas$.next(this._plantillas$.value.filter(p => p.id !== id))),
      catchError(this.handleError)
    );
  }

  /* ===================== Errores ===================== */
  private handleError(error: any) {
    console.error('HTTP error:', error);
    let msg = 'Ocurrió un error desconocido';
    if (error?.error?.message) msg = error.error.message;
    else if (error?.message) msg = error.message;
    return throwError(() => new Error(msg));
  }
}
