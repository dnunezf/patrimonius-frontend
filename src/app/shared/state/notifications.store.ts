import { Injectable, signal } from '@angular/core';

/** UI-only store for header badge. Replace with real API later. */
@Injectable({ providedIn: 'root' })
export class NotificationsStore {
  private readonly _count = signal(4);
  count = this._count.asReadonly();
  setCount(n: number) {
    this._count.set(Math.max(0, n));
  }
  decrement() {
    this._count.update((c) => Math.max(0, c - 1));
  }
}
