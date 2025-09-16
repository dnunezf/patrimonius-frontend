import { Component, computed } from '@angular/core';
import { NgFor, NgClass } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toasts',
  standalone: true,
  imports: [NgFor, NgClass],
  template: `
    <div class="toasts">
      <div class="toast" *ngFor="let t of items()" [ngClass]="t.kind">
        <span class="dot" aria-hidden="true"></span>
        <div class="msg">{{ t.text }}</div>
        <button class="x" (click)="close(t.id)" aria-label="Cerrar">×</button>
      </div>
    </div>
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
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 240px;
        max-width: 380px;
        padding: 10px 12px;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        background: #fff;
        box-shadow: 0 10px 22px rgba(16, 24, 40, 0.12);
      }
      .toast.success {
        border-color: #d1fae5;
      }
      .toast.error {
        border-color: #fee2e2;
      }
      .toast.info {
        border-color: #e5e7eb;
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      .success .dot {
        background: #16a34a;
      }
      .error .dot {
        background: #ef4444;
      }
      .info .dot {
        background: #64748b;
      }
      .msg {
        flex: 1;
      }
      .x {
        border: 0;
        background: transparent;
        font-size: 18px;
        cursor: pointer;
        color: #6b7280;
      }
      .x:hover {
        color: #111827;
      }
    `,
  ],
})
export class ToastsComponent {
  readonly items = computed(() => this.toasts.items());
  constructor(private toasts: ToastService) {}
  close(id: number) {
    this.toasts.dismiss(id);
  }
}
