import { Injectable } from '@angular/core';

const PREFIX = 'patrimonius_consulta_favoritos_v1_';

/**
 * Favoritos de consulta por usuario (solo en este navegador).
 */
@Injectable({ providedIn: 'root' })
export class ConsultaFavoritosService {
  private key(usuarioId: number): string {
    return `${PREFIX}${usuarioId}`;
  }

  getIds(usuarioId: number): number[] {
    if (!Number.isFinite(usuarioId) || usuarioId <= 0) return [];
    try {
      const raw = localStorage.getItem(this.key(usuarioId));
      const j = JSON.parse(raw || '[]');
      if (!Array.isArray(j)) return [];
      return [...new Set(j.map(Number).filter((n) => Number.isFinite(n) && n > 0))];
    } catch {
      return [];
    }
  }

  has(usuarioId: number, documentoId: number): boolean {
    return this.getIds(usuarioId).includes(documentoId);
  }

  add(usuarioId: number, documentoId: number): void {
    const ids = this.getIds(usuarioId);
    if (!ids.includes(documentoId)) ids.push(documentoId);
    this.setIds(usuarioId, ids);
  }

  remove(usuarioId: number, documentoId: number): void {
    this.setIds(
      usuarioId,
      this.getIds(usuarioId).filter((x) => x !== documentoId),
    );
  }

  toggle(usuarioId: number, documentoId: number): boolean {
    if (this.has(usuarioId, documentoId)) {
      this.remove(usuarioId, documentoId);
      return false;
    }
    this.add(usuarioId, documentoId);
    return true;
  }

  private setIds(usuarioId: number, ids: number[]): void {
    localStorage.setItem(this.key(usuarioId), JSON.stringify(ids));
  }
}
