import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Quill from 'quill';
import * as mammoth from 'mammoth';
import { interval, Subscription, switchMap } from 'rxjs';

import { DocumentService,VersionDoc } from 'core/services/document.service';
import { RealtimeService } from 'core/services/realtime.service';
import { CommentPanelComponent } from './comment-panel.component';
import { VersionHistoryDialogComponent } from './version-history-dialog.component';

@Component({
  standalone: true,
  selector: 'app-document-editor',
  imports: [CommonModule, FormsModule, CommentPanelComponent,VersionHistoryDialogComponent],
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

  saving = false;
  error = '';
  showComentarios = false;
  info = '';
  showRestoreModal = false;
  versiones: VersionDoc[] = [];
  selectedVersionId: number | null = null;
  restoreMotivo = '';
  restoring = false;
  showHistory = false;


  private readonly clientId =
    (globalThis as any).crypto?.randomUUID?.() ?? this.fallbackUuid();

  private subs: Subscription[] = [];


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private docs: DocumentService,
    private rt: RealtimeService
  ) {}

  openHistory(): void {
    this.showHistory = true;
    this.info = '';
  }

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
      reason: 'RESTORE'
    });
  }

  ngOnInit(): void {
    this.documentoId = Number(this.route.snapshot.paramMap.get('id'));

    // 1️⃣ Iniciar Quill
    this.quill = new Quill(this.editorRef.nativeElement, { theme: 'snow' });

    // 2️⃣ Emitir SOLO cambios del usuario (deltas)
    this.quill.on('text-change', (delta, _oldDelta, source) => {
      if (source !== 'user') return;
      this.rt.emit('delta', { delta, ts: Date.now(), from: this.clientId });

      // Fallback de compatibilidad
      this.rt.emit('content:patch', {
        content: this.html(),
        ts: Date.now(),
        from: this.clientId,
      });
    });

    // 3️⃣ Cargar contenido inicial
    this.docs.getContenido(this.documentoId).subscribe({
      next: (d) => {
        const html = d?.contenido || '';
        this.pasteHtml(html);
        this.baseVersionId = d?.latest_version_id ?? 0;
      },
      error: () => (this.error = 'No se pudo cargar el contenido'),
    });

    // 4️⃣ Conexión WS
    this.rt.connect();
    this.rt.emit('editor:join', { documentoId: this.documentoId });

    // 5️⃣ Presencia
    this.rt.on('presence:update', (u: any[]) => (this.presence = u));

    // 6️⃣ Aplicar DELTAS sin mover el cursor local
    this.rt.on('delta', (m: any) => {
      if (!m?.delta || m.from === this.clientId) return;
      this.quill.updateContents(m.delta as any, 'api');
    });

    // 7️⃣ Fallback HTML
    this.rt.on('content:patch', (m: any) => {
      if (!m?.content || m.from === this.clientId) return;
      this.setHtmlPreservingCaretAndScroll(m.content);
    });

    // 8️⃣ Guardado notificado desde otros
    this.rt.on('editor:saved', (_: any) => {});

    // 9️⃣ Conflictos → refrescar versión base
    this.rt.on('editor:conflict', (_: any) => {
      this.docs
        .ultimaVersion(this.documentoId)
        .subscribe((v) => (this.baseVersionId = v?.id ?? 0));
    });

    // 🔟 Comentarios en tiempo real
    this.rt.on('comentario:nuevo', (comentario: any) => {
      this.comentarios.push(comentario);
      this.unreadCount++;
    });

    // 11️⃣ Heartbeat REST para presencia
    this.subs.push(
      interval(20000)
        .pipe(switchMap(() => this.docs.touchSession(this.documentoId)))
        .subscribe()
    );

    // 12️⃣ Cargar comentarios iniciales
    this.loadComentarios();
  }

  /** 💬 Mostrar / ocultar panel de comentarios */
  toggleComentarios(): void {
    this.showComentarios = !this.showComentarios;
    if (this.showComentarios) this.unreadCount = 0;
  }

  /** 💾 Guardar versión */
  save(): void {
    this.saving = true;
    this.error = '';
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

  /** 📄 Importar DOCX → HTML */
  async importDocx(evt: Event): Promise<void> {
    const file = (evt.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const res = await mammoth.convertToHtml({ arrayBuffer: buf });

    this.pasteHtml(res.value || '');
    const end = Math.max(0, this.quill.getLength() - 1);
    this.quill.setSelection(end, 0, 'silent');
  }

  /** 💬 Agregar comentario (tiempo real) */
  addComentario(desc: string): void {
    if (!desc?.trim()) return;
    this.docs.agregarComentario(this.documentoId, desc).subscribe(() => {
      const comentario = {
        descripcion: desc,
        usuario: 'Tú',
        fecha: new Date(),
      };
      this.rt.emit('comentario:nuevo', comentario);
      this.comentarios.push(comentario);
    });
  }

  /** ✅ Nuevo método: marcar comentario como resuelto */
  markResolved(id: number): void {
    this.docs.marcarComentarioResuelto(id).subscribe(() => this.loadComentarios());
  }

  /** Cargar comentarios */
  private loadComentarios(): void {
    this.docs
      .listarComentarios(this.documentoId)
      .subscribe((c) => (this.comentarios = c));
  }

  /** 🔙 Volver al dashboard */
  goBack(): void {
    this.router.navigate(['/editor/dashboard']);
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.docs.endSession(this.documentoId).subscribe();
  }

  /* ==== Helpers seguros con Quill ==== */

  private html(): string {
    // Quill v2: getSemanticHTML(); Quill v1: root.innerHTML
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

  // ===== HU-010: UI =====
  openRestoreModal() {
    this.showRestoreModal = true;
    this.selectedVersionId = null;
    this.restoreMotivo = '';
    this.docs.listVersions(this.documentoId).subscribe({
      next: (rows: VersionDoc[]) => (this.versiones = rows),
      error: (e: any) => (this.error = e?.error?.message || 'No se pudieron cargar versiones'),
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
    this.docs.restoreVersion(this.documentoId, this.selectedVersionId, this.restoreMotivo || '')
      .subscribe({
        next: (_res) => {
          this.restoring = false;
          this.showRestoreModal = false;

          // Recarga el contenido actual (ya actualizado por el backend)
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

          // Feedback simple (puedes cambiar por toast)
          alert('Versión restaurada con éxito.');
        },
        error: (e) => {
          this.restoring = false;
          this.error = e?.error?.message || 'Error al restaurar versión';
        },
      });
  }
}
