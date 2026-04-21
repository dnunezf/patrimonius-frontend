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

/** Subconjunto de expedientes cuya vigencia ya venció (misma regla que la pestaña Alertas). */
export function listaExpedientesAlertasVencimiento(
  expedientes: ExpedientePlazoRow[]
): ExpedientePlazoRow[] {
  return expedientes.filter((ex) => esVencimientoPasadoRespectoAHoy(ex));
}
