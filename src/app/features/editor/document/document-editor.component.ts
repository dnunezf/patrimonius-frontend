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

  constructor(
    private route: ActivatedRoute,
    private docs: DocumentService,
    private rt: RealtimeService
  ) {}

  ngOnInit(): void {
    this.documentoId = Number(this.route.snapshot.paramMap.get('id'));

    // Iniciar Quill
    this.quill = new Quill(this.editorRef.nativeElement, { theme: 'snow' });
    this.quill.on('text-change', () => {
      const html = this.html();
      // parche en vivo
      this.rt.emit('content:patch', { content: html, ts: Date.now() });
    });

    // Cargar base version (para guardado con control de versión)
    this.docs.ultimaVersion(this.documentoId).subscribe(v => {
      this.baseVersionId = v?.id ?? 0;
      // si quieres precargar contenido, crea un endpoint GET /documentos/:id/contenido y setea this.html(contenido)
    });

    // Conectarse a WS y unirse al doc
    this.rt.connect();
    this.rt.emit('editor:join', { documentoId: this.documentoId });

    // Presencia y parches entrantes
    this.rt.on('presence:update', (u: any[]) => (this.presence = u));
    this.rt.on('content:patch', (m: any) => {
      if (!m?.content) return;
      this.setHtml(m.content); // estrategia simple (reemplazo)
    });

    // Guardado notificado desde otros
    this.rt.on('editor:saved', (_: any) => {
      // podrías mostrar un toast si quieres
    });

    // Conflictos
    this.rt.on('editor:conflict', (_: any) => {
      // refresca id base
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
    const html = this.html();

    this.docs
      .guardarColab(this.documentoId, html, this.baseVersionId)
      .subscribe({
        next: (r) => {
          this.saving = false;
          this.baseVersionId = r.version_id; // avanzamos versión base
        },
        error: (e) => {
          this.saving = false;
          if (e.status === 409) {
            // versión desactualizada → refresca id base
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
    this.setHtml(res.value || '');
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

  // Helpers HTML del editor
  private html(): string {
    return this.editorRef.nativeElement.querySelector('.ql-editor')!.innerHTML;
  }
  private setHtml(html: string): void {
    this.editorRef.nativeElement.querySelector('.ql-editor')!.innerHTML = html;
  }
}
