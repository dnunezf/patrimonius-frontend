import type { ExpedientePlazoRow } from '../../../../core/services/gestion-plazos-conservacion.service';

function fechaALocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Indica si la fecha de vencimiento del expediente es estrictamente anterior
 * al día calendario actual (zona local).
 *
 * Ej.: vence 20/04 y hoy 21/04 → true; vence 27/04 y hoy 20/04 → false.
 */
export function esVencimientoPasadoRespectoAHoy(
  ex: ExpedientePlazoRow
): boolean {
  const raw = ex.fecha_vencimiento;
  if (raw == null || raw === '') {
    return false;
  }
  const v = new Date(raw);
  if (Number.isNaN(v.getTime())) {
    return false;
  }
  const ymdV = fechaALocalYmd(v);
  const ymdHoy = fechaALocalYmd(new Date());
  return ymdV < ymdHoy;
}

const DIS_EJECUTADA_ELIM = 'DISPOSICION_EJECUTADA_ELIMINACION';
const DIS_EJECUTADA_TRANS = 'DISPOSICION_EJECUTADA_TRANSFERENCIA';
const DIS_EJECUTADA_CONS = 'DISPOSICION_EJECUTADA_CONSERVACION_PERMANENTE';

/**
 * True si el expediente sigue en la cola de atención por vencimiento (HU-032):
 * plazo vencido y aún no se ejecutó disposición final (transferido / eliminado / conservación ejecutada).
 * Los TRANSFERIDO / ELIMINADO solo deben verse en la pestaña «Expedientes archivados».
 */
export function expedienteRequiereAtencionAlertaVencimiento(
  ex: ExpedientePlazoRow
): boolean {
  if (!esVencimientoPasadoRespectoAHoy(ex)) {
    return false;
  }
  const estado = String(ex.estado ?? '')
    .trim()
    .toUpperCase();
  if (estado === 'TRANSFERIDO' || estado === 'ELIMINADO') {
    return false;
  }
  const dis = String(ex.disposicion_estado ?? '').trim();
  if (
    dis === DIS_EJECUTADA_ELIM ||
    dis === DIS_EJECUTADA_TRANS ||
    dis === DIS_EJECUTADA_CONS
  ) {
    return false;
  }
  return true;
}

/** Subconjunto para la pestaña «Alertas de vencimiento» (pendientes de actuación). */
export function listaExpedientesAlertasVencimiento(
  expedientes: ExpedientePlazoRow[]
): ExpedientePlazoRow[] {
  return expedientes.filter((ex) => expedienteRequiereAtencionAlertaVencimiento(ex));
}
