// src/app/editor/document/version-history-dialog.component.ts
import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentService, DocVersionRow } from 'core/services/document.service';

@Component({
  selector: 'app-version-history-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Overlay -->
    <div class="vh-overlay" *ngIf="open" (click)="close.emit()"></div>

    <!-- Modal -->
    <section class="vh-modal" *ngIf="open" role="dialog" aria-modal="true" aria-labelledby="vhTitle"
             (click)="$event.stopPropagation()">

      <header class="vh-header">
        <div class="vh-title">
          <h2 id="vhTitle">Restaurar versión</h2>
          <p class="vh-sub">Seleccioná una versión anterior. Se aplicará al documento actual.</p>
        </div>

        <button class="vh-x" type="button" (click)="close.emit()" aria-label="Cerrar">✕</button>
      </header>

      <div class="vh-body">

        <div class="vh-alert" role="note">
          <span class="vh-alert__icon">⚠</span>
          <div class="vh-alert__text">
            Recomendación: guardá antes de restaurar. La restauración quedará registrada en el historial.
          </div>
        </div>

        <div *ngIf="loading" class="vh-muted">Cargando versiones…</div>
        <div class="vh-err" *ngIf="error">{{ error }}</div>

        <!-- Lista (mejor que tabla para UI) -->
        <div class="vh-list" *ngIf="!loading && !error && rows.length">
          <button
            type="button"
            class="vh-item"
            *ngFor="let v of rows"
            (click)="selectedId = v.id"
            [class.is-selected]="selectedId === v.id"
          >
            <div class="vh-item__left">
              <div class="vh-item__name">
                {{ v.nombre_versionado || ('Versión #' + v.id) }}
              </div>
              <div class="vh-item__meta">
                ID {{ v.id }} • {{ v.fecha | date:'dd/MM/yyyy HH:mm' }}
              </div>
            </div>

            <div class="vh-radio" aria-hidden="true">
              <span class="dot" [class.on]="selectedId === v.id"></span>
            </div>
          </button>
        </div>

        <div *ngIf="!loading && !error && !rows.length" class="vh-empty">
          No hay versiones guardadas.
        </div>

        <div class="vh-motivo">
          <label>Motivo de restauración</label>
          <input [(ngModel)]="motivo" placeholder="Ej. Reversión por edición incorrecta">
        </div>

      </div>

      <footer class="vh-footer">
        <button type="button" class="vh-btn vh-btn--ghost" (click)="close.emit()">
          Cancelar
        </button>

        <button type="button"
                class="vh-btn vh-btn--primary"
                [disabled]="!selectedId || restoring"
                (click)="doRestore()">
          {{ restoring ? 'Restaurando…' : 'Restaurar' }}
        </button>
      </footer>
    </section>
  `,
  styles: [`
    /* Overlay */
    .vh-overlay{
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(2px);
      z-index: 2000;
    }

    /* Modal centrado */
    .vh-modal{
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: min(760px, calc(100vw - 28px));
      max-height: calc(100vh - 28px);
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      box-shadow: 0 24px 60px rgba(2, 8, 23, 0.25);
      overflow: hidden;
      z-index: 2001;
      display: flex;
      flex-direction: column;
    }

    /* Header */
    .vh-header{
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 18px;
      border-bottom: 1px solid #eef2f7;
      background: linear-gradient(180deg, #f8fafc, #ffffff);
    }
    .vh-title h2{
      margin: 0;
      font-family: "Neutraface Text", Verdana, Arial, sans-serif;
      font-size: 1.25rem;
      letter-spacing: .2px;
    }
    .vh-sub{
      margin: 6px 0 0 0;
      color: #64748b;
      font-size: .92rem;
    }

    .vh-x{
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: 1px solid #e5e7eb;
      background: #fff;
      cursor: pointer;
      font-weight: 900;
      color: #0f172a;
      transition: background .15s ease, transform .05s ease;
    }
    .vh-x:hover{ background:#f1f5f9; }
    .vh-x:active{ transform: translateY(1px); }

    /* Body */
    .vh-body{
      padding: 14px 18px 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow: hidden;
    }

    .vh-alert{
      display: grid;
      grid-template-columns: 22px 1fr;
      gap: 10px;
      padding: 10px 12px;
      border: 1px solid #fde68a;
      background: #fffbeb;
      border-radius: 12px;
    }
    .vh-alert__icon{
      display:flex;
      align-items:center;
      justify-content:center;
    }
    .vh-alert__text{
      color: #92400e;
      font-size: .92rem;
      line-height: 1.25rem;
    }

    /* Lista con scroll interno */
    .vh-list{
      border: 1px solid #eef2f7;
      border-radius: 12px;
      overflow: auto;
      max-height: 360px;
      background: #fff;
    }

    .vh-item{
      width: 100%;
      text-align: left;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 12px 12px;
      border: 0;
      background: transparent;
      cursor: pointer;
      border-bottom: 1px solid #f1f5f9;
      transition: background .15s ease, transform .05s ease;
    }
    .vh-item:last-child{ border-bottom: 0; }
    .vh-item:hover{ background: #f8fafc; }
    .vh-item:active{ transform: translateY(1px); }

    .vh-item.is-selected{
      background: rgba(2, 132, 199, 0.10);
      outline: 2px solid rgba(2, 132, 199, 0.25);
      outline-offset: -2px;
    }

    .vh-item__name{
      font-weight: 900;
      color: #0f172a;
      font-size: .98rem;
    }
    .vh-item__meta{
      margin-top: 4px;
      color: #64748b;
      font-size: .85rem;
    }

    /* radio bonito */
    .vh-radio .dot{
      width: 18px;
      height: 18px;
      border-radius: 999px;
      display: inline-block;
      border: 2px solid #cbd5e1;
      position: relative;
      background: #fff;
    }
    .vh-radio .dot.on{
      border-color: var(--mncr-blue-639, #0ea5e9);
    }
    .vh-radio .dot.on::after{
      content: "";
      position: absolute;
      inset: 4px;
      border-radius: 999px;
      background: var(--mncr-blue-639, #0ea5e9);
    }

    .vh-motivo label{
      display:block;
      font-weight: 800;
      color:#0f172a;
      margin: 4px 0 6px 0;
    }
    .vh-motivo input{
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d0d5dd;
      border-radius: 10px;
      font-size: 14px;
      outline: none;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    .vh-motivo input:focus{
      border-color: var(--mncr-blue-3015, #0284c7);
      box-shadow: 0 0 0 4px rgba(2,132,199,.12);
    }

    .vh-footer{
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 18px;
      border-top: 1px solid #eef2f7;
      background: #fff;
    }

    .vh-btn{
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid transparent;
      font-weight: 900;
      cursor: pointer;
      transition: background .15s ease, transform .05s ease, border-color .15s ease;
    }
    .vh-btn--ghost{
      background: #fff;
      border-color: #d0d5dd;
      color: #0f172a;
    }
    .vh-btn--ghost:hover{ background:#f1f5f9; }
    .vh-btn--ghost:active{ transform: translateY(1px); }

    .vh-btn--primary{
      background: var(--mncr-blue-639, #0ea5e9);
      color: #fff;
      box-shadow: 0 10px 18px rgba(14, 165, 233, 0.18);
    }
    .vh-btn--primary:hover{
      background: var(--mncr-blue-3015, #0284c7);
    }
    .vh-btn--primary:active{ transform: translateY(1px); }
    .vh-btn:disabled{
      opacity: .55;
      cursor: not-allowed;
      box-shadow: none;
    }

    .vh-err{ color:#b91c1c; font-weight: 700; }
    .vh-muted{ color:#64748b; }
    .vh-empty{ padding: 12px; color:#64748b; }
  `]
})
export class VersionHistoryDialogComponent implements OnChanges {
  @Input() open = false;
  @Input() documentoId!: number;

  @Output() close = new EventEmitter<void>();
  @Output() restored = new EventEmitter<{ newVersionId: number; html: string }>();

  rows: DocVersionRow[] = [];
  loading = false;
  error: string | null = null;

  selectedId?: number;
  motivo = '';
  restoring = false;

  constructor(private docs: DocumentService) {}

  ngOnChanges() {
    if (!this.open || !this.documentoId) return;
    this.loading = true;
    this.error = null;
    this.docs.listVersions(this.documentoId).subscribe({
      next: (rows) => {
        this.rows = rows;
        this.selectedId = rows[0]?.id;
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.error = 'No se pudo cargar el historial de versiones.';
        this.loading = false;
      }
    });
  }

  doRestore() {
    if (!this.selectedId) return;
    this.restoring = true;
    this.docs.restoreVersion(this.documentoId, this.selectedId, this.motivo || 'Restauración HU-010').subscribe({
      next: (res) => {
        this.restoring = false;
        this.restored.emit({ newVersionId: res.newVersionId, html: res.html });
        this.close.emit();
      },
      error: (e) => {
        console.error(e);
        this.restoring = false;
        this.error = 'No se pudo restaurar la versión.';
      }
    });
  }
}
