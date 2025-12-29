// FRONTEND: src/app/core/features/editor/document/document-editor.component.ts
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Quill from 'quill';
import * as mammoth from 'mammoth';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { DocumentService, VersionDoc } from 'core/services/document.service';
import { RealtimeService } from 'core/services/realtime.service';
import { CommentPanelComponent } from './comment/comment-panel.component';
import { VersionHistoryDialogComponent } from './version-history-dialog.component';
import { DocumentMetadataDialogComponent } from './metadata/document-metadata-dialog.component';

@Component({
  standalone: true,
  selector: 'app-document-editor',
  imports: [
    CommonModule,
    FormsModule,
    CommentPanelComponent,
    VersionHistoryDialogComponent,
    DocumentMetadataDialogComponent,
  ],
  templateUrl: './document-editor.component.html',
  styleUrls: ['./document-editor.component.css'],
})
export class DocumentEditorComponent implements OnInit, OnDestroy {
  @ViewChild('editor', { static: true }) editorRef!: ElementRef<HTMLDivElement>;
  quill!: Quill;

  documentoId!: number;
  baseVersionId = 0;

  presence: any[] = [];
  comentarios: any[] = [];
  unreadCount = 0;
  showComentarios = false;

  saving = false;
  error = '';
  info = '';

  // HU-010 (historial / restauración)
  showHistory = false;
  showRestoreModal = false;
  versiones: VersionDoc[] = [];
  selectedVersionId: number | null = null;
  restoreMotivo = '';
  restoring = false;

  // HU-11/12
  sigMsg = '';
  metadataOpen = false;

  private readonly clientId =
    (globalThis as any).crypto?.randomUUID?.() ?? this.fallbackUuid();

  private subs: Subscription[] = [];

  // ✅ Polling de comentarios cuando el panel está abierto
  private commentsPollSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private docs: DocumentService,
    private rt: RealtimeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.documentoId = Number(this.route.snapshot.paramMap.get('id'));

    // 1) Init Quill
    this.quill = new Quill(this.editorRef.nativeElement, { theme: 'snow' });

    // 2) Emit only user changes (deltas)
    this.quill.on('text-change', (delta, _oldDelta, source) => {
      if (source !== 'user') return;
      this.rt.emit('delta', { delta, ts: Date.now(), from: this.clientId });

      // Fallback compatibility for old clients
      this.rt.emit('content:patch', {
        content: this.html(),
        ts: Date.now(),
        from: this.clientId,
      });
    });

    // 3) Load initial content and base version
    this.docs.getContenido(this.documentoId).subscribe({
      next: (d) => {
        const html = d?.contenido || '';
        this.pasteHtml(html);
        this.baseVersionId = d?.latest_version_id ?? 0;
      },
      error: () => (this.error = 'No se pudo cargar el contenido'),
    });

    // 4) Connect WS and join doc
    this.rt.connect();
    this.rt.emit('editor:join', { documentoId: this.documentoId });

    // 5) Presence and incoming patches
    this.rt.on('presence:update', (u: any[]) => (this.presence = u));

    // 5.a) Apply deltas
    this.rt.on('delta', (m: any) => {
      if (!m?.delta || m.from === this.clientId) return;
      this.quill.updateContents(m.delta as any, 'api');
    });

    // 5.b) Fallback HTML patch
    this.rt.on('content:patch', (m: any) => {
      if (!m?.content || m.from === this.clientId) return;
      this.setHtmlPreservingCaretAndScroll(m.content);
    });

    // 6) Saved notif
    this.rt.on('editor:saved', (_: any) => {});

    // 7) Conflicts → refresh base version
    this.rt.on('editor:conflict', (_: any) => {
      this.docs
        .ultimaVersion(this.documentoId)
        .subscribe((v) => (this.baseVersionId = v?.id ?? 0));
    });

    // ✅ Realtime: cuando alguien agrega comentario (evento)
    this.rt.on('comentario:nuevo', (comentario: any) => {
      // ✅ inmutable, fuerza render
      this.comentarios = [...this.comentarios, comentario];
      this.unreadCount++;
      this.cdr.detectChanges();
    });

    // ✅ Realtime: cuando alguien marca resuelto (evento)
    this.rt.on('comentario:resuelto', (payload: any) => {
      const id = Number(payload?.id);
      if (!id) return;

      this.comentarios = this.comentarios.map((c) =>
        Number(c.id) === id ? { ...c, resuelto: true } : c
      );

      this.cdr.detectChanges();
    });

    // 8) Presence heartbeat
    this.subs.push(
      interval(20000)
        .pipe(switchMap(() => this.docs.touchSession(this.documentoId)))
        .subscribe()
    );

    // 9) Comments initial load
    this.loadComentarios();
  }

  /** Open history (HU-010) */
  openHistory(): void {
    this.showHistory = true;
    this.info = '';
  }

  /** Callback after restore from VersionHistoryDialog */
  onRestored(e: { newVersionId: number; html: string }) {
    this.pasteHtml(e.html);
    const end = Math.max(0, this.quill.getLength() - 1);
    this.quill.setSelection(end, 0, 'silent');
    this.baseVersionId = e.newVersionId;
    this.info = `Documento restaurado (v${e.newVersionId}). El historial se conserva.`;
    this.rt.emit('editor:saved', {
      documentoId: this.documentoId,
      versionId: this.baseVersionId,
      from: this.clientId,
      reason: 'RESTORE',
    });
  }

  /** Toggle comments side panel (badge reset + polling) */
  toggleComentarios(): void {
    this.showComentarios = !this.showComentarios;

    if (this.showComentarios) {
      this.unreadCount = 0;
      this.loadComentarios();
      this.startCommentsPolling();
    } else {
      this.stopCommentsPolling();
    }
  }

  /** ✅ Polling cada 2s solo con panel abierto */
  private startCommentsPolling(): void {
    this.stopCommentsPolling();
    this.commentsPollSub = interval(2000)
      .pipe(switchMap(() => this.docs.listarComentarios(this.documentoId)))
      .subscribe({
        next: (rows) => {
          this.comentarios = [...(rows ?? [])];
          this.cdr.detectChanges();
        },
        error: () => {},
      });
  }

  private stopCommentsPolling(): void {
    this.commentsPollSub?.unsubscribe();
    this.commentsPollSub = undefined;
  }

  /** Save version */
  save(): void {
    this.saving = true;
    this.error = '';
    this.sigMsg = '';
    const html = this.html();

    this.docs.guardarColab(this.documentoId, html, this.baseVersionId).subscribe({
      next: (r) => {
        this.saving = false;
        this.baseVersionId = r?.version_id ?? this.baseVersionId;
        this.rt.emit('editor:saved', {
          documentoId: this.documentoId,
          versionId: this.baseVersionId,
          from: this.clientId,
        });
        this.info = 'Documento guardado con éxito.';
        setTimeout(() => (this.info = ''), 4000);
      },
      error: (e) => {
        this.saving = false;
        if (e?.status === 409) {
          this.docs
            .ultimaVersion(this.documentoId)
            .subscribe((v) => (this.baseVersionId = v?.id ?? this.baseVersionId));
        } else {
          this.error = e?.error?.message || 'No se pudo guardar';
        }
      },
    });
  }

  /** HU-12: open metadata modal */
  openMetadata(): void {
    this.metadataOpen = true;
  }
  onMetadataSaved(): void {}

  /** HU-12: backend enforces metadata completeness */
  requestSignature(): void {
    this.error = '';
    this.sigMsg = '';
    this.docs.prepareForSignature(this.documentoId).subscribe({
      next: (r) => {
        this.sigMsg = `Índice oficial asignado: ${r.numero_serie_oficial}`;
      },
      error: (e) => {
        if (e?.error?.error === 'missing_required_metadata') {
          this.error = 'Faltan metadatos requeridos. Complete “Metadatos”.';
          this.metadataOpen = true;
        } else {
          this.error = e?.error?.message || 'No se pudo preparar la firma';
        }
      },
    });
  }

  /** Import DOCX → HTML (Mammoth) */
  async importDocx(evt: Event): Promise<void> {
    const file = (evt.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const res = await mammoth.convertToHtml({ arrayBuffer: buf });

    this.pasteHtml(res.value || '');
    const end = Math.max(0, this.quill.getLength() - 1);
    this.quill.setSelection(end, 0, 'silent');
  }

  /** ✅ Comentarios (sin recargar + realtime) */
  addComentario(desc: string): void {
    const texto = String(desc ?? '').trim();
    if (!texto) return;

    // ✅ optimista local (se ve al instante)
    const optimisticId = -Date.now();
    const optimistic = {
      id: optimisticId,
      descripcion: texto,
      usuario: 'Tú',
      fecha: new Date().toISOString(),
      resuelto: false,
    };
    this.comentarios = [...this.comentarios, optimistic];
    this.cdr.detectChanges();

    this.docs.agregarComentario(this.documentoId, texto).subscribe({
      next: (list) => {
        // ✅ Si backend devuelve lista, la usamos
        if (Array.isArray(list)) {
          this.comentarios = [...list];
        }
        this.cdr.detectChanges();

        // ✅ Emitir evento para otros clientes (si tu WS lo comparte)
        // Si el backend devolvió lista, enviamos el último como "nuevo"
        const last = Array.isArray(list) && list.length ? list[list.length - 1] : optimistic;
        this.rt.emit('comentario:nuevo', last);
      },
      error: () => {
        // revertir optimista si falló
        this.comentarios = this.comentarios.filter((c) => c.id !== optimisticId);
        this.cdr.detectChanges();
      },
    });
  }

  markResolved(id: number): void {
    const cid = Number(id);
    if (!cid) return;

    // ✅ optimista: se marca resuelto ya
    this.comentarios = this.comentarios.map((c) =>
      Number(c.id) === cid ? { ...c, resuelto: true } : c
    );
    this.cdr.detectChanges();

    this.docs.marcarComentarioResuelto(cid).subscribe({
      next: (list) => {
        if (Array.isArray(list)) {
          this.comentarios = [...list];
          this.cdr.detectChanges();
        } else {
          // fallback si el backend no devolvió lista
          this.loadComentarios();
        }

        // ✅ avisar a otros clientes
        this.rt.emit('comentario:resuelto', { id: cid });
      },
      error: () => {
        // revertir si falló
        this.comentarios = this.comentarios.map((c) =>
          Number(c.id) === cid ? { ...c, resuelto: false } : c
        );
        this.cdr.detectChanges();
      },
    });
  }

  private loadComentarios(): void {
    this.docs.listarComentarios(this.documentoId).subscribe({
      next: (c) => {
        this.comentarios = [...(c ?? [])];
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  /** Back to dashboard */
  goBack(): void {
    this.router.navigate(['/editor/dashboard']);
  }

  ngOnDestroy(): void {
    this.stopCommentsPolling();
    this.subs.forEach((s) => s.unsubscribe());
    this.docs.endSession(this.documentoId).subscribe();
  }

  /* ==== Quill helpers ==== */
  private html(): string {
    // @ts-ignore
    return (this.quill as any).getSemanticHTML?.() ?? this.quill.root.innerHTML;
  }
  private pasteHtml(html: string): void {
    this.quill.setContents([], 'silent');
    this.quill.clipboard.dangerouslyPasteHTML(0, html, 'api');
  }
  private setHtmlPreservingCaretAndScroll(html: string): void {
    const sel = this.quill.getSelection();
    const scroller = this.quill.root.parentElement!;
    const prevScrollTop = scroller.scrollTop;

    this.quill.setContents([], 'silent');
    this.quill.clipboard.dangerouslyPasteHTML(0, html, 'api');

    if (sel) {
      const max = Math.max(0, this.quill.getLength() - 1);
      const idx = Math.min(sel.index, max);
      const len = Math.min(sel.length ?? 0, Math.max(0, max - idx));
      this.quill.setSelection(idx, len, 'silent');
    }

    scroller.scrollTop = prevScrollTop;
  }
  private fallbackUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // ===== HU-010: restore modal helpers =====
  openRestoreModal() {
    this.showRestoreModal = true;
    this.selectedVersionId = null;
    this.restoreMotivo = '';
    this.docs.listVersions(this.documentoId).subscribe({
      next: (rows: VersionDoc[]) => (this.versiones = rows),
      error: (e: any) =>
        (this.error = e?.error?.message || 'No se pudieron cargar versiones'),
    });
  }
  closeRestoreModal() {
    this.showRestoreModal = false;
  }
  selectVersion(v: VersionDoc) {
    this.selectedVersionId = v.id;
  }
  confirmRestore() {
    if (!this.selectedVersionId) return;
    this.restoring = true;
    this.docs
      .restoreVersion(this.documentoId, this.selectedVersionId, this.restoreMotivo || '')
      .subscribe({
        next: () => {
          this.restoring = false;
          this.showRestoreModal = false;
          this.docs.getContenido(this.documentoId).subscribe({
            next: (d) => {
              const html = d?.contenido || '';
              this.pasteHtml(html);
              this.baseVersionId = d?.latest_version_id ?? 0;
            },
            error: () => {
              this.error = 'No se pudo cargar el contenido';
            },
          });
          alert('Versión restaurada con éxito.');
        },
        error: (e) => {
          this.restoring = false;
          this.error = e?.error?.message || 'Error al restaurar versión';
        },
      });
  }
}
