import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import Quill from 'quill';
import * as mammoth from 'mammoth';
import { interval, Subscription, switchMap } from 'rxjs';

import { DocumentService } from 'core/services/document.service';
import { RealtimeService } from 'core/services/realtime.service';
import { DocumentMetadataDialogComponent } from './document-metadata-dialog.component';

@Component({
  standalone: true,
  selector: 'app-document-editor',
  imports: [CommonModule, FormsModule, DocumentMetadataDialogComponent],
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
  sigMsg = '';

  // HU-11/12: metadata modal
  metadataOpen = false;

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
      error: () => {
        this.error = 'No se pudo cargar el contenido';
      },
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

    // 8) Presence heartbeat
    this.subs.push(
      interval(20000)
        .pipe(switchMap(() => this.docs.touchSession(this.documentoId)))
        .subscribe()
    );

    // 9) Comments
    this.loadComentarios();
  }

  /** Save version */
  save(): void {
    this.saving = true;
    this.error = '';
    this.sigMsg = '';
    const html = this.html();

    this.docs
      .guardarColab(this.documentoId, html, this.baseVersionId)
      .subscribe({
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
              .subscribe(
                (v) => (this.baseVersionId = v?.id ?? this.baseVersionId)
              );
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
  onMetadataSaved(): void {
    // optional refresh actions
  }

  /** HU-12: request signature, backend enforces metadata completeness */
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

  /** Comments (HU-016) */
  addComentario(desc: string): void {
    if (!desc?.trim()) return;
    this.docs
      .agregarComentario(this.documentoId, desc)
      .subscribe(() => this.loadComentarios());
  }
  private loadComentarios(): void {
    this.docs
      .listarComentarios(this.documentoId)
      .subscribe((c) => (this.comentarios = c));
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.docs.endSession(this.documentoId).subscribe();
  }

  /* ==== Quill helpers ==== */

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
}
