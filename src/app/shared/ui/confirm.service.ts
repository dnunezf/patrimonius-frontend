import { Injectable, signal } from '@angular/core';

export type ConfirmAskOptions = {
  confirmLabel?: string;
  cancelLabel?: string;
};

/** Headless confirmation dialog controller that returns a Promise<boolean>. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly open = signal(false);
  readonly title = signal<string>('Confirmar');
  readonly text = signal<string>('¿Continuar?');
  readonly confirmLabel = signal<string>('Sí, continuar');
  readonly cancelLabel = signal<string>('Cancelar');

  private resolver: ((v: boolean) => void) | null = null;

  /**
   * Ask for confirmation. Resolves true/false without blocking the thread.
   * @param options Etiquetas de botones opcionales (p. ej. Aceptar / Cancelar).
   */
  ask(
    text: string,
    title = 'Confirmar',
    options?: ConfirmAskOptions,
  ): Promise<boolean> {
    this.title.set(title);
    this.text.set(text);
    this.confirmLabel.set(options?.confirmLabel ?? 'Sí, continuar');
    this.cancelLabel.set(options?.cancelLabel ?? 'Cancelar');
    this.open.set(true);
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  /** Called by the dialog buttons. */
  resolve(v: boolean) {
    this.open.set(false);
    this.resolver?.(v);
    this.resolver = null;
  }
}
