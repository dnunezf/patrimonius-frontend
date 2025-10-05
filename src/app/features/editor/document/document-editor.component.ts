import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import Quill from 'quill';
import * as mammoth from 'mammoth';
import { interval, Subscription, switchMap } from 'rxjs';

import { DocumentService } from 'core/services/document.service';
import { RealtimeService } from 'core/services/realtime.service';

@Component({
  standalone: true,
  selector: 'app-document-editor',
  imports: [CommonModule, FormsModule],
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

  saving = false;
  error = '';

  private readonly clientId =
    (globalThis as any).crypto?.randomUUID?.() ?? this.fallbackUuid();

  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private docs: DocumentService,
    private rt: RealtimeService
  ) {}

  ngOnInit(): void {
    this.documentoId = Number(this.route.snapshot.paramMap.get('id'));

    // 1) Iniciar Quill
    this.quill = new Quill(this.editorRef.nativeElement, { theme: 'snow' });

    // 2) Emitir SOLO cambios del usuario (deltas)
    this.quill.on('text-change', (delta, _oldDelta, source) => {
      if (source !== 'user') return;
      this.rt.emit('delta', { delta, ts: Date.now(), from: this.clientId });

      // Fallback de compatibilidad (si algún cliente viejo escucha 'content:patch')
      this.rt.emit('content:patch', {
        content: this.html(),
        ts: Date.now(),
        from: this.clientId,
      });
    });

    // 3) Cargar contenido inicial y fijar versión base
    this.docs.getContenido(this.documentoId).subscribe({
      next: (d) => {
        const html = d?.contenido || '';
        this.pasteHtml(html);            // usa API de Quill (no tocar innerHTML directo)
        this.baseVersionId = d?.latest_version_id ?? 0;
      },
      error: () => {
        this.error = 'No se pudo cargar el contenido';
      },
    });

    // 4) Conectarse a WS y unirse al doc
    this.rt.connect();
    this.rt.emit('editor:join', { documentoId: this.documentoId });

    // 5) Presencia y parches entrantes
    this.rt.on('presence:update', (u: any[]) => (this.presence = u));

    // 5.a) Ruta principal: aplicar DELTAS sin mover el cursor del usuario local
    this.rt.on('delta', (m: any) => {
      if (!m?.delta || m.from === this.clientId) return;
      this.quill.updateContents(m.delta as any, 'api');
      // Quill preserva selección y scroll con 'api' automáticamente
    });

    // 5.b) Fallback: si llega HTML, pegamos conservando caret y scroll
    this.rt.on('content:patch', (m: any) => {
      if (!m?.content || m.from === this.clientId) return;
      this.setHtmlPreservingCaretAndScroll(m.content);
    });

    // 6) Guardado notificado desde otros
    this.rt.on('editor:saved', (_: any) => {
      // opcional: mostrar toast
    });

    // 7) Conflictos → refrescar versión base
    this.rt.on('editor:conflict', (_: any) => {
      this.docs.ultimaVersion(this.documentoId)
        .subscribe(v => (this.baseVersionId = v?.id ?? 0));
    });

    // 8) Heartbeat REST para presencia (fallback)
    this.subs.push(
      interval(20000)
        .pipe(switchMap(() => this.docs.touchSession(this.documentoId)))
        .subscribe()
    );

    // 9) Comentarios
    this.loadComentarios();
  }

  /** Guardar versión */
  save(): void {
    this.saving = true;
    this.error = '';
    const html = this.html();

    this.docs.guardarColab(this.documentoId, html, this.baseVersionId).subscribe({
      next: (r) => {
        this.saving = false;
        this.baseVersionId = r?.version_id ?? this.baseVersionId;
        // notificar a los demás que se guardó
        this.rt.emit('editor:saved', {
          documentoId: this.documentoId,
          versionId: this.baseVersionId,
          from: this.clientId,
        });
      },
      error: (e) => {
        this.saving = false;
        if (e?.status === 409) {
          // versión desactualizada
          this.docs.ultimaVersion(this.documentoId)
            .subscribe(v => (this.baseVersionId = v?.id ?? this.baseVersionId));
        } else {
          this.error = e?.error?.message || 'No se pudo guardar';
        }
      },
    });
  }

  /** Importar DOCX → HTML (Mammoth) */
  async importDocx(evt: Event): Promise<void> {
    const file = (evt.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const res = await mammoth.convertToHtml({ arrayBuffer: buf });

    // Pegar con Quill y llevar caret al final sin “saltos”
    this.pasteHtml(res.value || '');
    const end = Math.max(0, this.quill.getLength() - 1);
    this.quill.setSelection(end, 0, 'silent');
  }

  /** Comentarios (HU-016) */
  addComentario(desc: string): void {
    if (!desc?.trim()) return;
    this.docs.agregarComentario(this.documentoId, desc)
      .subscribe(() => this.loadComentarios());
  }
  private loadComentarios(): void {
    this.docs.listarComentarios(this.documentoId)
      .subscribe(c => (this.comentarios = c));
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.docs.endSession(this.documentoId).subscribe();
  }

  /* ==== Helpers seguros con Quill (sin tocar innerHTML directo) ==== */

  /** HTML actual del editor */
  private html(): string {
    // Quill v2: getSemanticHTML(); Quill v1: root.innerHTML
    // @ts-ignore - usa root para compatibilidad si no tienes v2
    return (this.quill as any).getSemanticHTML?.() ?? this.quill.root.innerHTML;
  }

  /** Pega HTML desde 0 usando API de Quill */
  private pasteHtml(html: string): void {
    this.quill.setContents([], 'silent'); // limpiar sin parpadeo
    this.quill.clipboard.dangerouslyPasteHTML(0, html, 'api');
  }

  /** Pega HTML preservando selección y scroll */
  private setHtmlPreservingCaretAndScroll(html: string): void {
    const sel = this.quill.getSelection();
    const scroller = this.quill.root.parentElement!; // .ql-container
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

  /** Fallback por si no existe crypto.randomUUID */
  private fallbackUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
