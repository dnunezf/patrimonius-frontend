
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationsStore {
  private _count = signal(0);
  count = this._count.asReadonly();

  setCount(n: number) {
    const safe = Number.isFinite(n) ? n : 0;
    this._count.set(Math.max(0, safe));
  }

  decrement() {
    this._count.update(v => Math.max(0, v - 1));
  }
}
