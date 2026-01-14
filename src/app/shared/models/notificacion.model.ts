export type NotiAccion = 'EDITAR' | 'FIRMAR' | 'ARCHIVAR' | 'ELIMINAR';

export interface Notificacion {
  id: number;
  fecha: string; // ISO o datetime string
  tipo: string;
  accion_requerida: NotiAccion;
  fecha_limite: string | null;
  enlace_directo: string | null;
  resultado: string | null;

  usuario_id: number;
  documento_id: number;

  leida: number; // 0/1
  leida_en: string | null;

  documento_titulo?: string; // viene del JOIN en tu repo
}
