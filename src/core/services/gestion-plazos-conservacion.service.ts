import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import type {
  SerieOption,
  SubserieOption,
  UnidadOption,
} from './document.service';

/** Documento con datos de plazo (p. ej. `/gestion-plazos/proximos`, `/vencidos`). */
export interface DocumentoPlazoRow {
  id: number;
  titulo: string;
  estado: string;
  plazo_valor: number | null;
  plazo_unidad: 'DIAS' | 'MESES' | 'ANIOS' | null;
  plazo_tipo: 'ADMINISTRATIVO' | 'LEGAL' | 'HISTORICO' | null;
  fecha_inicio_conservacion: string | null;
  fecha_vencimiento: string | null;
  estado_conservacion: 'VIGENTE' | 'PROXIMO_A_VENCER' | 'VENCIDO' | null;
  plazo_asignado_por: number | null;
  plazo_asignado_en: string | null;
  asignado_por_correo?: string | null;
}

/** Fila del listado principal: expedientes CERRADO | TRANSFERIDO | ELIMINADO (`GET /gestion-plazos`). */
export interface ExpedientePlazoRow {
  id: number;
  codigo: string;
  nombre: string;
  unidad_nombre: string;
  serie_nombre: string;
  subserie_nombre: string | null;
  estado: 'CERRADO' | 'TRANSFERIDO' | 'ELIMINADO';
  /** Columna `fecha_creacion` en Expediente. */
  fecha_creacion: string | null;
  fecha_cierre: string | null;
  /** Vigencia del expediente (columnas `fecha_inicio_vigencia` / `fecha_vencimiento`). */
  fecha_inicio_vigencia: string | null;
  fecha_vencimiento: string | null;
  /** Nombre (y apellidos) o correo del usuario `created_by`. */
  creado_por: string | null;
}

/** Fila de `GET /documentos/expediente/:expedienteId` (misma forma que en clasificación). */
export interface ExpedienteDocumentoListRow {
  id: number;
  titulo: string;
  estado: string;
  numero_serie?: string | null;
  expediente_id?: number | null;
}

export interface AsignarPlazoBody {
  plazo_valor: number;
  plazo_unidad: 'DIAS' | 'MESES' | 'ANIOS';
  fecha_inicio_conservacion: string;
  fecha_vencimiento: string;
}

export interface ListarPlazosParams {
  texto?: string;
  /** Refina entre CERRADO | TRANSFERIDO | ELIMINADO */
  estado?: string;
  unidad_id?: number;
  serie_id?: number;
  subserie_id?: number;
}

export interface ExtenderVigenciaExpedienteBody {
  anios: number;
  justificacion: string;
}

@Injectable({ providedIn: 'root' })
export class GestionPlazosConservacionService {
  private readonly api = environment.api;

  constructor(private readonly http: HttpClient) {}

  getUnidadesCatalogo(): Observable<UnidadOption[]> {
    return this.http.get<UnidadOption[]>(
      `${this.api}/api/carga-masiva/catalogos/unidades`
    );
  }

  getSeriesCatalogo(): Observable<SerieOption[]> {
    return this.http.get<SerieOption[]>(
      `${this.api}/api/carga-masiva/catalogos/series`
    );
  }

  getSubseriesCatalogo(serieId: number): Observable<SubserieOption[]> {
    return this.http.get<SubserieOption[]>(
      `${this.api}/api/carga-masiva/catalogos/subseries?serie_id=${serieId}`
    );
  }

  listarPlazos(params?: ListarPlazosParams): Observable<ExpedientePlazoRow[]> {
    let httpParams = new HttpParams();

    if (params?.texto) {
      httpParams = httpParams.set('texto', params.texto);
    }
    if (params?.estado) {
      httpParams = httpParams.set('estado', params.estado);
    }
    if (params?.unidad_id != null && params.unidad_id > 0) {
      httpParams = httpParams.set('unidad_id', String(params.unidad_id));
    }
    if (params?.serie_id != null && params.serie_id > 0) {
      httpParams = httpParams.set('serie_id', String(params.serie_id));
    }
    if (params?.subserie_id != null && params.subserie_id > 0) {
      httpParams = httpParams.set('subserie_id', String(params.subserie_id));
    }

    return this.http
      .get<unknown>(`${this.api}/gestion-plazos`, { params: httpParams })
      .pipe(map((body) => this.normalizarFilasExpediente(body)));
  }

  /** Normaliza respuesta del API (p. ej. variaciones de mayúsculas en claves). */
  private normalizarFilasExpediente(body: unknown): ExpedientePlazoRow[] {
    let rows: unknown[] = [];
    if (Array.isArray(body)) {
      rows = body;
    } else if (body && typeof body === 'object') {
      const b = body as Record<string, unknown>;
      if (Array.isArray(b['data'])) {
        rows = b['data'];
      } else if (Array.isArray(b['rows'])) {
        rows = b['rows'];
      } else if (Array.isArray(b['expedientes'])) {
        rows = b['expedientes'];
      } else if (Array.isArray(b['items'])) {
        rows = b['items'];
      }
    }
    return rows.map((r) => this.normalizarFilaExpediente(r));
  }

  private normalizarFilaExpediente(raw: unknown): ExpedientePlazoRow {
    if (raw == null || typeof raw !== 'object') {
      return {
        id: 0,
        codigo: '',
        nombre: '',
        unidad_nombre: '—',
        serie_nombre: '—',
        subserie_nombre: null,
        estado: 'CERRADO',
        fecha_creacion: null,
        fecha_cierre: null,
        fecha_inicio_vigencia: null,
        fecha_vencimiento: null,
        creado_por: null,
      };
    }
    const o = raw as Record<string, unknown>;
    const lowerKeyToOriginal = (): Map<string, string> => {
      const m = new Map<string, string>();
      for (const k of Object.keys(o)) {
        m.set(k.toLowerCase(), k);
      }
      return m;
    };
    const lowerMap = lowerKeyToOriginal();
    const pick = (...keys: string[]): unknown => {
      for (const k of keys) {
        if (o[k] !== undefined && o[k] !== null) {
          return o[k];
        }
      }
      for (const k of keys) {
        const orig = lowerMap.get(k.toLowerCase());
        if (orig != null) {
          const v = o[orig];
          if (v !== undefined && v !== null) {
            return v;
          }
        }
      }
      return undefined;
    };
    const str = (v: unknown) => (v == null ? '' : String(v));
    const id = Number(pick('id', 'ID') ?? 0);
    const estadoUp = str(pick('estado', 'ESTADO'))
      .trim()
      .toUpperCase();
    let estado: ExpedientePlazoRow['estado'] = 'CERRADO';
    if (estadoUp === 'TRANSFERIDO') {
      estado = 'TRANSFERIDO';
    } else if (estadoUp === 'ELIMINADO') {
      estado = 'ELIMINADO';
    } else if (estadoUp === 'CERRADO') {
      estado = 'CERRADO';
    }
    let fechaCreacion: string | null = null;
    const fcr = pick('fecha_creacion', 'fechaCreacion', 'FECHA_CREACION');
    if (fcr != null && fcr !== '') {
      fechaCreacion = this.valorFechaApiAIso(fcr);
    }
    let fechaCierre: string | null = null;
    const fc = pick('fecha_cierre', 'fechaCierre', 'FECHA_CIERRE');
    if (fc != null && fc !== '') {
      fechaCierre = this.valorFechaApiAIso(fc);
    }
    const parseFechaNullable = (v: unknown): string | null => {
      if (v == null || v === '') {
        return null;
      }
      return this.valorFechaApiAIso(v);
    };
    return {
      id,
      codigo: str(pick('codigo', 'CODIGO')),
      nombre: str(pick('nombre', 'NOMBRE')),
      unidad_nombre: str(pick('unidad_nombre', 'unidadNombre', 'UNIDAD_NOMBRE')) || '—',
      serie_nombre: str(pick('serie_nombre', 'serieNombre', 'SERIE_NOMBRE')) || '—',
      subserie_nombre: (() => {
        const v = pick('subserie_nombre', 'subserieNombre', 'SUBSERIE_NOMBRE');
        if (v == null || v === '') {
          return null;
        }
        return str(v);
      })(),
      estado,
      fecha_creacion: fechaCreacion,
      fecha_cierre: fechaCierre,
      fecha_inicio_vigencia: parseFechaNullable(
        pick(
          'fecha_inicio_vigencia',
          'fechaInicioVigencia',
          'FECHA_INICIO_VIGENCIA'
        )
      ),
      fecha_vencimiento: parseFechaNullable(
        pick('fecha_vencimiento', 'fechaVencimiento', 'FECHA_VENCIMIENTO')
      ),
      creado_por: (() => {
        const v = pick('creado_por', 'creadoPor', 'CREADO_POR');
        if (v == null || v === '') {
          return null;
        }
        const t = str(v).trim();
        return t === '' || t === '—' ? null : t;
      })(),
    };
  }

  /** Fecha desde API (ISO, mysql `YYYY-MM-DD HH:mm:ss`, epoch ms) → ISO para `DatePipe`. */
  private valorFechaApiAIso(v: unknown): string | null {
    if (v == null || v === '') {
      return null;
    }
    if (v instanceof Date) {
      return Number.isNaN(v.getTime()) ? null : v.toISOString();
    }
    if (typeof v === 'number' && Number.isFinite(v)) {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    const s = String(v).trim();
    if (!s) {
      return null;
    }
    const mysqlLike = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2}(\.\d+)?)/;
    const normalized = mysqlLike.test(s) ? s.replace(' ', 'T') : s;
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) {
      return null;
    }
    return d.toISOString();
  }

  asignarPlazo(documentoId: number, body: AsignarPlazoBody): Observable<unknown> {
    return this.http.post(
      `${this.api}/gestion-plazos/${documentoId}/asignar`,
      body
    );
  }

  listarProximosAVencer(days = 30): Observable<DocumentoPlazoRow[]> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<DocumentoPlazoRow[]>(
      `${this.api}/gestion-plazos/proximos`,
      { params }
    );
  }

  listarVencidos(): Observable<DocumentoPlazoRow[]> {
    return this.http.get<DocumentoPlazoRow[]>(
      `${this.api}/gestion-plazos/vencidos`
    );
  }

  revisarVencimientos(days = 30): Observable<unknown> {
    return this.http.post(`${this.api}/gestion-plazos/revisar-vencimientos`, {
      days,
    });
  }

  extenderVigenciaExpediente(
    expedienteId: number,
    body: ExtenderVigenciaExpedienteBody
  ): Observable<unknown> {
    return this.http.post(
      `${this.api}/gestion-plazos/expediente/${expedienteId}/extender-vigencia`,
      body
    );
  }

  /** Documentos asignados al expediente (índice / clasificación). */
  getDocumentosByExpedienteId(
    expedienteId: number
  ): Observable<ExpedienteDocumentoListRow[]> {
    return this.http.get<ExpedienteDocumentoListRow[]>(
      `${this.api}/documentos/expediente/${expedienteId}`
    );
  }
}
