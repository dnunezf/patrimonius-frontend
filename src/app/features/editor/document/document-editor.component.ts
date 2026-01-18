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

type UiUser = { id: number; label: string };

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

  // =========================
  // ✅ MODAL: Solicitar firma (NUEVO UI)
  // =========================
  requestSigModalOpen = false;
  requestSigLoading = false;
  requestSigError = '';

  // buscador grande
  firmantesQuery = '';

  // lista total desde backend
  firmantes: UiUser[] = [];

  // "combobox" (select) elegido
  selectedCandidateId: number | null = null;

  // firmantes agregados (en orden)
  selectedFirmantesList: UiUser[] = [];

  private readonly clientId =
    (globalThis as any).crypto?.randomUUID?.() ?? this.fallbackUuid();

  private subs: Subscription[] = [];
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

      // fallback compatibility
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

    // 5) Presence
    this.rt.on('presence:update', (u: any[]) => (this.presence = u));

    // 5.a) Apply deltas
    this.rt.on('delta', (m: any) => {
      if (!m?.delta || m.from === this.clientId) return;
      this.quill.updateContents(m.delta as any, 'api');
    });

    this.rt.on('content:patch', (m: any) => {
      if (!m?.content || m.from === this.clientId) return;
      this.setHtmlPreservingCaretAndScroll(m.content);
    });

    // 7) Conflicts → refresh base version
    this.rt.on('editor:conflict', (_: any) => {
      this.docs
        .ultimaVersion(this.documentoId)
        .subscribe((v) => (this.baseVersionId = v?.id ?? 0));
    });

    // ✅ Realtime comments
    this.rt.on('comentario:nuevo', (comentario: any) => {
      this.comentarios = [...this.comentarios, comentario];
      this.unreadCount++;
      this.cdr.detectChanges();
    });

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

  // =========================
  // HU-010
  // =========================
  openHistory(): void {
    this.showHistory = true;
    this.info = '';
  }

  onRestored(e: { newVersionId: number; html: string }) {
    if (e?.html != null) this.pasteHtml(e.html);

    const end = Math.max(0, this.quill.getLength() - 1);
    this.quill.setSelection(end, 0, 'silent');

    this.baseVersionId = e?.newVersionId ?? this.baseVersionId;
    this.info = `Documento restaurado (v${this.baseVersionId}). El historial se conserva.`;

    this.rt.emit('editor:saved', {
      documentoId: this.documentoId,
      versionId: this.baseVersionId,
      from: this.clientId,
      reason: 'RESTORE',
    });
  }

  // =========================
  // Comentarios
  // =========================
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

  addComentario(desc: string): void {
    const texto = String(desc ?? '').trim();
    if (!texto) return;

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
        if (Array.isArray(list)) this.comentarios = [...list];
        this.cdr.detectChanges();

        const last =
          Array.isArray(list) && list.length ? list[list.length - 1] : optimistic;

        this.rt.emit('comentario:nuevo', last);
      },
      error: () => {
        this.comentarios = this.comentarios.filter((c) => c.id !== optimisticId);
        this.cdr.detectChanges();
      },
    });
  }

  markResolved(id: number): void {
    const cid = Number(id);
    if (!cid) return;

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
          this.loadComentarios();
        }
        this.rt.emit('comentario:resuelto', { id: cid });
      },
      error: () => {
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

  // =========================
  // Guardado / Metadata
  // =========================
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

  openMetadata(): void {
    this.metadataOpen = true;
  }
  onMetadataSaved(): void {}

  // =========================
  // ✅ Solicitar firma (Modal) — SOLO ESTA PARTE CAMBIÓ
  // =========================
  openRequestSignatureModal(): void {
    this.requestSigError = '';
    this.sigMsg = '';
    this.error = '';

    this.requestSigModalOpen = true;
    this.requestSigLoading = true;

    this.firmantesQuery = '';
    this.selectedCandidateId = null;
    this.selectedFirmantesList = [];

    // ✅ Cargar usuarios del backend
    this.docs.listUsers().subscribe({
      next: (rows: any[]) => {
        this.requestSigLoading = false;

        this.firmantes = (rows ?? [])
          .map((u: any) => {
            const label =
              `${u.nombre ?? ''} ${u.apellido1 ?? ''} ${u.apellido2 ?? ''}`.trim() ||
              `${u.email ?? ''}`.trim() ||
              `Usuario ${u.id}`;

            return { id: Number(u.id), label };
          })
          .filter((u: UiUser) => !!u.id)
          .sort((a: UiUser, b: UiUser) => a.label.localeCompare(b.label));

        // si hay texto ya escrito, revalida el select
        this.ensureSelectedCandidateStillValid();
      },
      error: (e: any) => {
        this.requestSigLoading = false;
        this.requestSigError =
          e?.error?.message || 'No se pudieron cargar los usuarios.';
      },
    });
  }

  closeRequestSignatureModal(): void {
    this.requestSigModalOpen = false;
    this.requestSigLoading = false;
    this.requestSigError = '';
    this.firmantesQuery = '';
    this.selectedCandidateId = null;
    this.selectedFirmantesList = [];
  }

  // ✅ Buscar por nombre o apellido (es sobre label completo)
  get filteredFirmantes(): UiUser[] {
    const q = this.normalize(this.firmantesQuery);
    if (!q) return this.excludeAlreadySelected(this.firmantes);

    const tokens = q.split(/\s+/).filter(Boolean);
    const filtered = this.firmantes.filter((u) => {
      const hay = this.normalize(u.label);
      return tokens.every((t) => hay.includes(t));
    });

    return this.excludeAlreadySelected(filtered);
  }

  // se llama desde (input) del search
  onFirmanteQueryChange(): void {
    // Si el usuario seleccionado ya no está en la lista filtrada, lo “reseteamos”
    this.ensureSelectedCandidateStillValid();
  }

  private ensureSelectedCandidateStillValid(): void {
    if (this.selectedCandidateId == null) return;
    const exists = this.filteredFirmantes.some((u) => u.id === this.selectedCandidateId);
    if (!exists) this.selectedCandidateId = null;
  }

  private excludeAlreadySelected(list: UiUser[]): UiUser[] {
    const selectedIds = new Set(this.selectedFirmantesList.map((x) => x.id));
    return list.filter((u) => !selectedIds.has(u.id));
  }

  // ✅ Agregar desde el “combo”
  addSelectedFirmante(): void {
    const id = Number(this.selectedCandidateId);
    if (!id) return;

    const user = this.firmantes.find((u) => u.id === id);
    if (!user) return;

    // evitar duplicados
    if (this.selectedFirmantesList.some((x) => x.id === id)) {
      this.selectedCandidateId = null;
      return;
    }

    this.selectedFirmantesList = [...this.selectedFirmantesList, user];
    this.selectedCandidateId = null;

    // para que el select no quede con algo inválido
    this.ensureSelectedCandidateStillValid();
  }

  // ✅ Quitar “chip”
  removeFirmante(id: number): void {
    const uid = Number(id);
    if (!uid) return;
    this.selectedFirmantesList = this.selectedFirmantesList.filter((x) => x.id !== uid);
    this.ensureSelectedCandidateStillValid();
  }

  // ✅ Confirmar: manda firmantesIds al backend
  confirmRequestSignature(): void {
    this.requestSigError = '';
    this.error = '';
    this.sigMsg = '';

    const firmantesIds = this.selectedFirmantesList.map((u) => u.id);

    if (!firmantesIds.length) {
      this.requestSigError = 'Debe agregar al menos un firmante.';
      return;
    }

    this.requestSigLoading = true;

    this.docs
      .prepareForSignature(this.documentoId, {
        firmantesIds,
        // ✅ ya NO mandamos fecha limite porque quitaste ese campo en UI
        fecha_limite: null,
      })
      .subscribe({
        next: (r: any) => {
          this.requestSigLoading = false;
          this.sigMsg = `Índice oficial asignado: ${r.numero_serie_oficial}`;
          this.closeRequestSignatureModal();
        },
        error: (e: any) => {
          this.requestSigLoading = false;

          if (e?.error?.error === 'missing_required_metadata') {
            this.requestSigError =
              'Faltan metadatos requeridos. Complete “Metadatos”.';
            this.metadataOpen = true;
            return;
          }

          this.requestSigError =
            e?.error?.message || 'No se pudo preparar la firma';
        },
      });
  }

  private normalize(s: string): string {
    return String(s ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  // =========================
  // Import DOCX
  // =========================
  async importDocx(evt: Event): Promise<void> {
    const file = (evt.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const buf = await file.arrayBuffer();
    const res = await mammoth.convertToHtml({ arrayBuffer: buf });

    this.pasteHtml(res.value || '');
    const end = Math.max(0, this.quill.getLength() - 1);
    this.quill.setSelection(end, 0, 'silent');
  }

  // =========================
  // Navegación / Destroy
  // =========================
  goBack(): void {
    this.router.navigate(['/editor/dashboard']);
  }

  ngOnDestroy(): void {
    this.stopCommentsPolling();
    this.subs.forEach((s) => s.unsubscribe());
    this.docs.endSession(this.documentoId).subscribe();
  }

  // =========================
  // Helpers Quill
  // =========================
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

  // ===== HU-010: restore modal helpers (si aún los usas) =====
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
      .restoreVersion(
        this.documentoId,
        this.selectedVersionId,
        this.restoreMotivo || ''
      )
      .subscribe({
        next: (res: any) => {
          this.restoring = false;
          this.showRestoreModal = false;

          if (res?.html != null) this.pasteHtml(res.html);

          const end = Math.max(0, this.quill.getLength() - 1);
          this.quill.setSelection(end, 0, 'silent');

          this.baseVersionId = res?.newVersionId ?? this.baseVersionId;

          alert('Versión restaurada con éxito.');
        },
        error: (e) => {
          this.restoring = false;
          this.error = e?.error?.message || 'Error al restaurar versión';
        },
      });
  }
}
