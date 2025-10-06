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
  <div class="backdrop" *ngIf="open" (click)="close.emit()">
    <div class="dlg" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
      <h3>Historial de versiones</h3>

      <div *ngIf="loading">Cargando versiones…</div>
      <div class="err" *ngIf="error">{{ error }}</div>

      <table class="tbl" *ngIf="!loading && !error && rows.length">
        <thead>
          <tr>
            <th></th>
            <th>ID</th>
            <th>Fecha</th>
            <th>Nombre</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let v of rows" (click)="selectedId = v.id" [class.sel]="selectedId===v.id">
            <td><input type="radio" name="ver" [value]="v.id" [(ngModel)]="selectedId"></td>
            <td>{{ v.id }}</td>
            <td>{{ v.fecha | date:'short' }}</td>
            <td>{{ v.nombre_versionado || '—' }}</td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="!loading && !error && !rows.length" class="muted">No hay versiones guardadas.</div>

      <div class="motivo">
        <label>Motivo de restauración</label>
        <input [(ngModel)]="motivo" placeholder="Ej. Reversión por edición incorrecta">
      </div>

      <div class="row">
        <button type="button" (click)="close.emit()">Cancelar</button>
        <button class="primary" type="button" [disabled]="!selectedId || restoring"
                (click)="doRestore()">
          {{ restoring ? 'Restaurando…' : 'Restaurar' }}
        </button>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .backdrop{position:fixed;inset:0;background:rgba(0,0,0,.35);display:grid;place-items:center;z-index:2000}
    .dlg{width:min(720px,95vw);background:#fff;border-radius:12px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.2)}
    .tbl{width:100%;border-collapse:collapse;margin:10px 0}
    .tbl th,.tbl td{border:1px solid #e5e7eb;padding:6px 8px}
    .tbl tr.sel{background:#f1f5f9}
    .row{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}
    .primary{background:#2563eb;color:#fff;border:0;padding:8px 12px;border-radius:8px}
    .err{color:#b91c1c;margin:6px 0}
    .muted{color:#6b7280}
    .motivo{margin-top:8px}
    .motivo input{width:100%}
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
        // selecciona la última por defecto
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
