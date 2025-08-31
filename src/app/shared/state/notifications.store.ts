import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationsStore {
  // UI-only demo state
  private _count = signal(4);
  count = this._count.asReadonly();
  setCount(n: number) {
    this._count.set(Math.max(0, n));
  }
  decrement() {
    this._count.update((c) => Math.max(0, c - 1));
  }
}
