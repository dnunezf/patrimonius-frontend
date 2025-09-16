import { Injectable, signal } from '@angular/core';

/** Small toast model */
export type Toast = { id: number; kind: 'success'|'error'|'info'; text: string; timeout?: number };

/** Headless toast bus. Container component listens to this signal. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private _items = signal<Toast[]>([]);
  readonly items = this._items.asReadonly();
  private seq = 0;

  /** Enqueue a toast with auto-dismiss. */
  show(kind: Toast['kind'], text: string, timeout = 2800) {
    const id = ++this.seq;
    const t: Toast = { id, kind, text, timeout };
    this._items.update(arr => [t, ...arr]);
    if (timeout > 0) {
      setTimeout(() => this.dismiss(id), timeout);
    }
  }
  success(msg: string, timeout?: number) { this.show('success', msg, timeout); }
  error(msg: string, timeout?: number)   { this.show('error', msg, timeout); }
  info(msg: string, timeout?: number)    { this.show('info', msg, timeout); }

  /** Remove a toast by id. */
  dismiss(id: number) {
    this._items.update(arr => arr.filter(t => t.id !== id));
  }
}
