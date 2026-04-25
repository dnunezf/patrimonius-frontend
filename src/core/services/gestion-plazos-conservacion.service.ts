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
  /** Política de la serie (HU-032), si existe en BD. */
  politica_disposicion?:
    | 'ELIMINACION'
    | 'TRANSFERENCIA'
    | 'CONSERVACION_PERMANENTE'
    | null;
  disposicion_estado?: string | null;
  disposicion_tipo?: string | null;
  acta_eliminacion_codigo?: string | null;
  paquete_transferencia_zip_path?: string | null;
}

export interface BitacoraExpedienteItem {
  id: number;
  fecha: string;
  evento: string;
  resultado: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  detalle: Record<string, unknown> | null;
  usuario_email: string | null;
  usuario_nombre: string | null;
}

export interface ExpedienteConservacionDetalleResponse {
  expediente: ExpedientePlazoRow;
  disposicion: {
    estado: string | null;
    tipo: string | null;
    justificacion_inicio: string | null;
    revision: Record<string, unknown> | null;
    justificacion_aprobacion: string | null;
    motivo_rechazo: string | null;
    acta_eliminacion_codigo: string | null;
    acta_eliminacion_pdf_path: string | null;
    paquete_transferencia_zip_path: string | null;
    metadatos_resumen: Record<string, unknown> | null;
  };
  bitacora: BitacoraExpedienteItem[];
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
  /** Solo expedientes con fecha de vencimiento anterior a hoy (HU-032). */
  solo_vencidos?: boolean;
}

export interface ExtenderVigenciaExpedienteBody {
  anios: number;
  justificacion: string;
}

export interface AprobarDisposicionExpedienteBody {
  justificacion: string;
}

export interface EjecutarTransferenciaDisposicionCompletaBody {
  justificacion_inicio: string;
  justificacion_aprobacion: string;
}

export interface EjecutarEliminacionDisposicionCompletaBody {
  justificacion_inicio: string;
  justificacion_aprobacion: string;
}

export interface EjecutarTransferenciaDisposicionCompletaResponse {
  expediente_id: number;
  disposicion_estado: string;
  expediente_estado: string;
  paquete_transferencia_zip_path: string | null;
}

export interface EjecutarEliminacionDisposicionCompletaResponse {
  expediente_id: number;
  disposicion_estado: string;
  expediente_estado: string;
  acta_eliminacion_codigo: string | null;
  acta_eliminacion_pdf_path: string | null;
}

@Injectable({ providedIn: 'root' })
export class GestionPlazosConservacionService {
  private readonly api = environment.api;

  constructor(private readonly http: HttpClient) {}

  getUnidadesCatalogo(): Observable<UnidadOption[]> {
    return this.http.get<UnidadOption[]>(
      `${this.api}/api/carga-masiva/catalogos/unidades`,
    );
  }

  getSeriesCatalogo(): Observable<SerieOption[]> {
    return this.http.get<SerieOption[]>(
      `${this.api}/api/carga-masiva/catalogos/series`,
    );
  }

  getSubseriesCatalogo(serieId: number): Observable<SubserieOption[]> {
    return this.http.get<SubserieOption[]>(
      `${this.api}/api/carga-masiva/catalogos/subseries?serie_id=${serieId}`,
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
    if (params?.solo_vencidos) {
      httpParams = httpParams.set('solo_vencidos', '1');
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
        politica_disposicion: null,
        disposicion_estado: null,
        disposicion_tipo: null,
        acta_eliminacion_codigo: null,
        paquete_transferencia_zip_path: null,
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

    const estadoUp = str(pick('estado', 'ESTADO')).trim().toUpperCase();

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
      unidad_nombre:
        str(pick('unidad_nombre', 'unidadNombre', 'UNIDAD_NOMBRE')) || '—',
      serie_nombre:
        str(pick('serie_nombre', 'serieNombre', 'SERIE_NOMBRE')) || '—',
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
          'FECHA_INICIO_VIGENCIA',
        ),
      ),
      fecha_vencimiento: parseFechaNullable(
        pick('fecha_vencimiento', 'fechaVencimiento', 'FECHA_VENCIMIENTO'),
      ),
      creado_por: (() => {
        const v = pick('creado_por', 'creadoPor', 'CREADO_POR');
        if (v == null || v === '') {
          return null;
        }
        const t = str(v).trim();
        return t === '' || t === '—' ? null : t;
      })(),
      politica_disposicion: (() => {
        const v = pick(
          'politica_disposicion',
          'politicaDisposicion',
          'POLITICA_DISPOSICION',
        );
        if (v == null || v === '') return null;
        const u = str(v).trim().toUpperCase();
        if (
          u === 'ELIMINACION' ||
          u === 'TRANSFERENCIA' ||
          u === 'CONSERVACION_PERMANENTE'
        ) {
          return u as ExpedientePlazoRow['politica_disposicion'];
        }
        return null;
      })(),
      disposicion_estado: (() => {
        const v = pick('disposicion_estado', 'disposicionEstado');
        return v == null || v === '' ? null : str(v).trim();
      })(),
      disposicion_tipo: (() => {
        const v = pick('disposicion_tipo', 'disposicionTipo');
        return v == null || v === '' ? null : str(v).trim().toUpperCase();
      })(),
      acta_eliminacion_codigo: (() => {
        const v = pick('acta_eliminacion_codigo', 'actaEliminacionCodigo');
        return v == null || v === '' ? null : str(v);
      })(),
      paquete_transferencia_zip_path: (() => {
        const v = pick(
          'paquete_transferencia_zip_path',
          'paqueteTransferenciaZipPath',
        );
        return v == null || v === '' ? null : str(v);
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

  asignarPlazo(
    documentoId: number,
    body: AsignarPlazoBody,
  ): Observable<unknown> {
    return this.http.post(
      `${this.api}/gestion-plazos/${documentoId}/asignar`,
      body,
    );
  }

  listarProximosAVencer(days = 30): Observable<DocumentoPlazoRow[]> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<DocumentoPlazoRow[]>(
      `${this.api}/gestion-plazos/proximos`,
      { params },
    );
  }

  listarVencidos(): Observable<DocumentoPlazoRow[]> {
    return this.http.get<DocumentoPlazoRow[]>(
      `${this.api}/gestion-plazos/vencidos`,
    );
  }

  revisarVencimientos(days = 30): Observable<unknown> {
    return this.http.post(`${this.api}/gestion-plazos/revisar-vencimientos`, {
      days,
    });
  }

  extenderVigenciaExpediente(
    expedienteId: number,
    body: ExtenderVigenciaExpedienteBody,
  ): Observable<unknown> {
    return this.http.post(
      `${this.api}/gestion-plazos/expediente/${expedienteId}/extender-vigencia`,
      body,
    );
  }

  getDetalleConservacionExpediente(
    expedienteId: number,
  ): Observable<ExpedienteConservacionDetalleResponse> {
    return this.http.get<ExpedienteConservacionDetalleResponse>(
      `${this.api}/gestion-plazos/expediente/${expedienteId}/detalle-conservacion`,
    );
  }

  iniciarDisposicionExpediente(
    expedienteId: number,
    body: { tipo_disposicion: string; justificacion: string },
  ): Observable<unknown> {
    return this.http.post(
      `${this.api}/gestion-plazos/expediente/${expedienteId}/disposicion/iniciar`,
      body,
    );
  }

  registrarRevisionDisposicion(
    expedienteId: number,
    body: {
      checklist: {
        metadatos_ok: boolean;
        firma_ok: boolean;
        plazo_ok: boolean;
        politica_ok: boolean;
      };
      notas?: string;
    },
  ): Observable<unknown> {
    return this.http.post(
      `${this.api}/gestion-plazos/expediente/${expedienteId}/disposicion/revision`,
      body,
    );
  }

  aprobarDisposicionExpediente(
    expedienteId: number,
    body: AprobarDisposicionExpedienteBody,
  ): Observable<unknown> {
    return this.http.post(
      `${this.api}/gestion-plazos/expediente/${expedienteId}/disposicion/aprobar`,
      body,
    );
  }

  /** Inicio + revisión + ZIP y estado TRANSFERIDO en un solo flujo (HU-032). */
  ejecutarTransferenciaDisposicionCompleta(
    expedienteId: number,
    body: EjecutarTransferenciaDisposicionCompletaBody,
  ): Observable<EjecutarTransferenciaDisposicionCompletaResponse> {
    return this.http.post<EjecutarTransferenciaDisposicionCompletaResponse>(
      `${this.api}/gestion-plazos/expediente/${expedienteId}/disposicion/transferencia/ejecutar`,
      body,
    );
  }

  /** Inicio + revisión + acta + eliminación física (HU-032). */
  ejecutarEliminacionDisposicionCompleta(
    expedienteId: number,
    body: EjecutarEliminacionDisposicionCompletaBody,
  ): Observable<EjecutarEliminacionDisposicionCompletaResponse> {
    return this.http.post<EjecutarEliminacionDisposicionCompletaResponse>(
      `${this.api}/gestion-plazos/expediente/${expedienteId}/disposicion/eliminacion/ejecutar`,
      body,
    );
  }

  /** ZIP de transferencia generado por la disposición (tras ejecutar). */
  descargarPaqueteTransferenciaZip(expedienteId: number): Observable<Blob> {
    return this.http.get(
      `${this.api}/gestion-plazos/expediente/${expedienteId}/disposicion/paquete-transferencia-zip`,
      { responseType: 'blob' },
    );
  }

  /** Acta de eliminación en Word (.docx), tras ejecutar eliminación. */
  descargarActaEliminacionDocx(expedienteId: number): Observable<Blob> {
    return this.http.get(
      `${this.api}/gestion-plazos/expediente/${expedienteId}/disposicion/acta-eliminacion-docx`,
      { responseType: 'blob' },
    );
  }

  rechazarDisposicionExpediente(
    expedienteId: number,
    body: { motivo: string },
  ): Observable<unknown> {
    return this.http.post(
      `${this.api}/gestion-plazos/expediente/${expedienteId}/disposicion/rechazar`,
      body,
    );
  }

  /** Documentos asignados al expediente (índice / clasificación). */
  getDocumentosByExpedienteId(
    expedienteId: number,
  ): Observable<ExpedienteDocumentoListRow[]> {
    return this.http.get<ExpedienteDocumentoListRow[]>(
      `${this.api}/documentos/expediente/${expedienteId}`,
    );
  }
}
