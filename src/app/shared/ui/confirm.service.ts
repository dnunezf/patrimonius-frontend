import { Injectable, signal } from '@angular/core';

/** Headless confirmation dialog controller that returns a Promise<boolean>. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly open = signal(false);
  readonly title = signal<string>('Confirmar');
  readonly text = signal<string>('¿Continuar?');

  private resolver: ((v: boolean) => void) | null = null;

  /** Ask for confirmation. Resolves true/false without blocking the thread. */
  ask(text: string, title = 'Confirmar'): Promise<boolean> {
    this.title.set(title);
    this.text.set(text);
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
