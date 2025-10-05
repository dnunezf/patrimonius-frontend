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

  private subs: Subscription[] = [];
  private readonly clientId = crypto.randomUUID();

  constructor(
    private route: ActivatedRoute,
    private docs: DocumentService,
    private rt: RealtimeService
  ) {}

  ngOnInit(): void {
    this.documentoId = Number(this.route.snapshot.paramMap.get('id'));

    // Iniciar Quill
    this.quill = new Quill(this.editorRef.nativeElement, { theme: 'snow' });

    // Emitir deltas (NO HTML) y evitar eco con clientId
    this.quill.on('text-change', (delta, _oldDelta, source) => {
      if (source !== 'user') return;
      this.rt.emit('content:patch', { from: this.clientId, delta, ts: Date.now() });
    });

    this.docs.getContenido(this.documentoId).subscribe(d => {
      // setear HTML inicial sin romper el caret
      const range = this.quill.getSelection();
      this.quill.clipboard.dangerouslyPasteHTML(d.contenido || '', 'silent');
      if (range) this.quill.setSelection(range.index, range.length, 'silent');
      // dejar base con la última versión
      this.baseVersionId = d.latest_version_id ?? 0;
    });


    // Cargar base de versión (para guardado con control de versionado)
    this.docs.ultimaVersion(this.documentoId).subscribe(v => {
      this.baseVersionId = v?.id ?? 0;
      // Si tienes un GET /documentos/:id/contenido, aquí podrías:
      // this.setHtmlSafe(contenidoInicial);
    });

    // Conectarse a WS y unirse al doc
    this.rt.connect();
    this.rt.emit('editor:join', { documentoId: this.documentoId, from: this.clientId });

    // ======== Eventos Realtime ========
    // Presencia
    this.rt.on('presence:update', (u: any[]) => (this.presence = u));

    // Parches entrantes → aplicar delta (preferido) o fallback a HTML
    this.rt.on('content:patch', (m: any) => {
      if (!m) return;
      if (m.from === this.clientId) return; // evita auto-eco

      if (m.delta) {
        this.quill.updateContents(m.delta, 'silent');
      } else if (m.content) {
        // Fallback: si el servidor aún envía HTML completo
        const range = this.quill.getSelection();
        this.quill.clipboard.dangerouslyPasteHTML(m.content, 'silent');
        if (range) this.quill.setSelection(range.index, range.length, 'silent');
      }
    });

    // Guardado notificado desde otros
    this.rt.on('editor:saved', (_: any) => {
      // opcional: toast
    });

    // Conflictos → refrescar baseVersionId
    this.rt.on('editor:conflict', (_: any) => {
      this.docs.ultimaVersion(this.documentoId).subscribe(v => (this.baseVersionId = v?.id ?? 0));
    });

    // Heartbeat REST para presencia (fallback)
    this.subs.push(
      interval(20000)
        .pipe(switchMap(() => this.docs.touchSession(this.documentoId)))
        .subscribe()
    );

    // Comentarios
    this.loadComentarios();
  }

  /** Guardar versión (HU-008) */
  save(): void {
    this.saving = true;
    this.error = '';
    const html = this.getHtml();

    this.docs
      .guardarColab(this.documentoId, html, this.baseVersionId)
      .subscribe({
        next: (r) => {
          this.saving = false;

          // 👇 Manejo del caso "sin cambios"
          if (r.saved === false && r.reason === 'NO_CHANGES') {
            // NO muevas baseVersionId; opcional: refrescar versión
            // this.docs.ultimaVersion(this.documentoId).subscribe(v => this.baseVersionId = v?.id ?? this.baseVersionId);
            // opcional: toast/UI
            // this.toast.info('No hay cambios para guardar');
            return;
          }

          // Caso normal: avanzamos baseVersionId
          this.baseVersionId = r.version_id;

          // Opcional: mostrar nombre_versionado si vino
          // if (r.nombre_versionado) this.toast.success(`Guardado: ${r.nombre_versionado}`);

          // Notificar a otros si quieres
          this.rt.emit('editor:saved', { documentoId: this.documentoId, versionId: r.version_id });
        },
        error: (e) => {
          this.saving = false;
          if (e.status === 409) {
            // versión desactualizada → refrescar base
            this.docs.ultimaVersion(this.documentoId).subscribe(v => (this.baseVersionId = v?.id ?? 0));
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
    this.setHtmlSafe(res.value || '');
  }

  /** Comentarios (HU-016) */
  addComentario(desc: string): void {
    if (!desc?.trim()) return;
    this.docs.agregarComentario(this.documentoId, desc).subscribe(() => this.loadComentarios());
  }
  private loadComentarios(): void {
    this.docs.listarComentarios(this.documentoId).subscribe(c => (this.comentarios = c));
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.docs.endSession(this.documentoId).subscribe();
  }

  // ======== Helpers seguros con Quill (NO tocar innerHTML directamente) ========
  private getHtml(): string {
    return this.quill.root.innerHTML;
  }

  private setHtmlSafe(html: string): void {
    // Preserva (en lo posible) el caret al pegar HTML completo
    const range = this.quill.getSelection();
    this.quill.clipboard.dangerouslyPasteHTML(html, 'silent');
    if (range) this.quill.setSelection(range.index, range.length, 'silent');
  }
}
