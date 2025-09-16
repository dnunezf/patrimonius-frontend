import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { ConfirmService } from './confirm.service';

/** Lightweight global confirm dialog bound to ConfirmService. */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [NgIf],
  template: `
    <div class="backdrop" *ngIf="svc.open()" (click)="svc.resolve(false)">
      <div
        class="dlg"
        role="dialog"
        aria-modal="true"
        (click)="$event.stopPropagation()"
      >
        <h3>{{ svc.title() }}</h3>
        <p class="msg">{{ svc.text() }}</p>
        <div class="row">
          <button class="btn ghost" type="button" (click)="svc.resolve(false)">
            Cancelar
          </button>
          <button class="btn danger" type="button" (click)="svc.resolve(true)">
            Sí, continuar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(16, 24, 40, 0.45);
        display: grid;
        place-items: center;
        z-index: 1900;
      }
      .dlg {
        width: 100%;
        max-width: 420px;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        box-shadow: 0 14px 40px rgba(0, 0, 0, 0.18);
        padding: 16px;
      }
      .msg {
        color: #374151;
        margin: 8px 0 14px;
      }
      .row {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      .btn {
        padding: 10px 14px;
        border-radius: 8px;
        font-weight: 700;
        border: 1px solid transparent;
        cursor: pointer;
      }
      .btn.ghost {
        background: #fff;
        border-color: #e5e7eb;
      }
      .btn.danger {
        background: #ef4444;
        color: #fff;
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  constructor(public svc: ConfirmService) {}
}
