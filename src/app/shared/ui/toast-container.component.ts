import { Component } from '@angular/core';
import { NgFor, NgClass } from '@angular/common';
import { ToastService } from './toast.service';

/** Visual container that renders toasts from ToastService. */
@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [NgFor, NgClass],
  template: `
    <section class="toasts" aria-live="polite" aria-atomic="true">
      <div
        class="toast"
        *ngFor="let t of bus.items()"
        [ngClass]="{
          ok: t.kind === 'success',
          err: t.kind === 'error',
          inf: t.kind === 'info'
        }"
        (click)="bus.dismiss(t.id)"
      >
        {{ t.text }}
      </div>
    </section>
  `,
  styles: [
    `
      .toasts {
        position: fixed;
        right: 16px;
        bottom: 16px;
        display: grid;
        gap: 8px;
        z-index: 2000;
      }
      .toast {
        padding: 10px 12px;
        border-radius: 10px;
        color: #111;
        border: 1px solid #e5e7eb;
        background: #fff;
        font-weight: 700;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        cursor: pointer;
      }
      .toast.ok {
        border-color: #c6f6d5;
        background: #ecfdf5;
        color: #065f46;
      }
      .toast.err {
        border-color: #fecaca;
        background: #fef2f2;
        color: #991b1b;
      }
      .toast.inf {
        border-color: #bfdbfe;
        background: #eff6ff;
        color: #1e3a8a;
      }
    `,
  ],
})
export class ToastContainerComponent {
  constructor(public bus: ToastService) {}
}
