import { Injectable } from '@angular/core';

const PREFIX = 'patrimonius_consulta_panel_v1_';

/**
 * Preferencias del panel "Consulta de documentos" por usuario (navegador).
 * Los valores "desde" ocultan actividad anterior sin borrar la bitácora en servidor.
 */
@Injectable({ providedIn: 'root' })
export class ConsultaPanelPrefsService {
  private key(userId: number, part: string): string {
    return `${PREFIX}${userId}_${part}`;
  }

  getHistorialDesde(userId: number): string | null {
    return this.getRaw(userId, 'historialDesde');
  }

  clearHistorial(userId: number): void {
    this.setRaw(userId, 'historialDesde', new Date().toISOString());
  }

  resetHistorial(userId: number): void {
    localStorage.removeItem(this.key(userId, 'historialDesde'));
  }

  getRecientesDesde(userId: number): string | null {
    return this.getRaw(userId, 'recientesDesde');
  }

  clearRecientes(userId: number): void {
    this.setRaw(userId, 'recientesDesde', new Date().toISOString());
  }

  resetRecientes(userId: number): void {
    localStorage.removeItem(this.key(userId, 'recientesDesde'));
  }

  getDescargasDesde(userId: number): string | null {
    return this.getRaw(userId, 'descargasDesde');
  }

  clearDescargas(userId: number): void {
    this.setRaw(userId, 'descargasDesde', new Date().toISOString());
  }

  resetDescargas(userId: number): void {
    localStorage.removeItem(this.key(userId, 'descargasDesde'));
  }

  getNovedadesDesde(userId: number): string | null {
    return this.getRaw(userId, 'novedadesDesde');
  }

  clearNovedades(userId: number): void {
    this.setRaw(userId, 'novedadesDesde', new Date().toISOString());
  }

  resetNovedades(userId: number): void {
    localStorage.removeItem(this.key(userId, 'novedadesDesde'));
  }

  private getRaw(userId: number, part: string): string | null {
    if (!Number.isFinite(userId) || userId <= 0) return null;
    try {
      return localStorage.getItem(this.key(userId, part));
    } catch {
      return null;
    }
  }

  private setRaw(userId: number, part: string, value: string): void {
    if (!Number.isFinite(userId) || userId <= 0) return;
    try {
      localStorage.setItem(this.key(userId, part), value);
    } catch {
      /* ignore quota */
    }
  }
}
