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
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import Quill from 'quill';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { DocumentService, VersionDoc } from 'core/services/document.service';
import { RealtimeService } from 'core/services/realtime.service';
import { CommentPanelComponent } from './comment/comment-panel.component';
import { VersionHistoryDialogComponent } from './version-history-dialog.component';
import { DocumentMetadataDialogComponent } from './metadata/document-metadata-dialog.component';
import { ConsultarExpedientesDialogComponent } from './consultaExpediente/consultar-expedientes-dialog.component';

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
    ConsultarExpedientesDialogComponent,
  ],
  templateUrl: './document-editor.component.html',
  styleUrls: ['./document-editor.component.css'],
})
export class DocumentEditorComponent implements OnInit, OnDestroy {
  @ViewChild('editor', { static: true }) editorRef!: ElementRef<HTMLDivElement>;
  quill!: Quill;

  documentoId!: number;
  baseVersionId = 0;

  isReadOnly = false;

  presence: any[] = [];
  comentarios: any[] = [];
  unreadCount = 0;
  showComentarios = false;

  saving = false;
  error = '';
  info = '';

  showHistory = false;
  showRestoreModal = false;
  versiones: VersionDoc[] = [];
  selectedVersionId: number | null = null;
  restoreMotivo = '';
  restoring = false;

  sigMsg = '';
  metadataOpen = false;

  requestSigModalOpen = false;
  requestSigLoading = false;
  requestSigError = '';

  firmantesQuery = '';
  firmantes: UiUser[] = [];
  selectedCandidateId: number | null = null;
  selectedFirmantesList: UiUser[] = [];

  consultaExpedientesOpen = false;
  showPageLayoutPanel = false;
  useDifferentFirstPage = false;
  autoPageNumberInFooter = false;
  docxHeaderFirstHtml = '';
  docxHeaderHtml = '';
  docxFooterFirstHtml = '';
  docxFooterHtml = '';

  private readonly clientId =
    (globalThis as any).crypto?.randomUUID?.() ?? this.fallbackUuid();

  private subs: Subscription[] = [];
  private commentsPollSub?: Subscription;

  readonly pageVisualHeightPx = 1122;
  readonly pageGapPx = 0;
  currentVisualPage = 1;
  currentEditorScrollTop = 0;

  private onEditorScroll = () => this.updateCurrentPageFromScroll();

  imageSizeByTarget: Record<
    'headerFirst' | 'headerDefault' | 'footerFirst' | 'footerDefault',
    number
  > = {
    headerFirst: 120,
    headerDefault: 120,
    footerFirst: 90,
    footerDefault: 90,
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private docs: DocumentService,
    private rt: RealtimeService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.documentoId = Number(this.route.snapshot.paramMap.get('id'));

    const qp = this.route.snapshot.queryParamMap;
    const ro = qp.get('readonly');
    this.isReadOnly = ro === '1' || ro === 'true';

    this.quill = new Quill(this.editorRef.nativeElement, {
      theme: 'snow',
      readOnly: this.isReadOnly,
    });

    if (this.isReadOnly) {
      this.quill.enable(false);
    }

    /**
     * IMPORTANTE:
     * Para colaboración en vivo solo enviamos DELTA.
     * No enviamos content:patch por cada tecla porque eso reemplaza todo el HTML
     * y puede provocar saltos de cursor/foco entre usuarios.
     */
    if (!this.isReadOnly) {
      this.quill.on('text-change', (delta, _oldDelta, source) => {
        if (source !== 'user') return;

        this.rt.emit('delta', {
          documentoId: this.documentoId,
          delta,
          ts: Date.now(),
          from: this.clientId,
        });

        this.updateCurrentPageFromSelection();
      });
    }

    this.quill.on('selection-change', () => this.updateCurrentPageFromSelection());
    this.quill.root.addEventListener('scroll', this.onEditorScroll);

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

    this.rt.connect();
    this.rt.emit('editor:join', {
      documentoId: this.documentoId,
    });

    this.rt.on('presence:update', (u: any[]) => {
      this.presence = u;
      this.cdr.detectChanges();
    });

    /**
     * Aplica cambios remotos sin reemplazar todo el HTML.
     * Esto evita que un usuario le quite el cursor al otro.
     */
    this.rt.on('delta', (m: any) => {
      if (!m?.delta) return;
      if (m.from === this.clientId) return;

      this.quill.updateContents(m.delta as any, 'api');
    });

    /**
     * IMPORTANTE:
     * Ya no escuchamos content:patch para edición en vivo.
     * content:patch solo debería usarse para casos especiales como restaurar,
     * recargar todo el documento o sincronización completa controlada.
     */
    /*
    this.rt.on('content:patch', (m: any) => {
      if (!m?.content || m.from === this.clientId) return;
      this.setHtmlPreservingCaretAndScroll(m.content);
    });
    */

    this.rt.on('editor:conflict', (_: any) => {
      this.docs
        .ultimaVersion(this.documentoId)
        .subscribe((v) => (this.baseVersionId = v?.id ?? 0));
    });

    this.rt.on('editor:saved', (m: any) => {
      if (m?.version_id) {
        this.baseVersionId = Number(m.version_id);
      }
    });

    this.rt.on('editor:error', (m: any) => {
      this.error = m?.message || 'Ocurrió un error en el editor colaborativo.';
      this.cdr.detectChanges();
    });

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

    if (!this.isReadOnly) {
      this.subs.push(
        interval(20000)
          .pipe(switchMap(() => this.docs.touchSession(this.documentoId)))
          .subscribe()
      );
    }

    this.loadComentarios();
  }

  openHistory(): void {
    this.showHistory = true;
    this.info = '';
  }

  openConsultaExpedientes(): void {
    this.consultaExpedientesOpen = true;
  }

  onRestored(e: { newVersionId: number; html: string }) {
    if (e?.html != null) {
      this.pasteHtml(e.html);
    }

    const end = Math.max(0, this.quill.getLength() - 1);
    this.quill.setSelection(end, 0, 'silent');

    this.baseVersionId = e?.newVersionId ?? this.baseVersionId;
    this.info = `Documento restaurado (v${this.baseVersionId}). El historial se conserva.`;

    /**
     * Al restaurar sí tiene sentido avisar que hubo un guardado/restauración.
     * No usamos esto para mover cursores ni reemplazar contenido mientras se escribe.
     */
    this.rt.emit('editor:saved', {
      documentoId: this.documentoId,
      versionId: this.baseVersionId,
      from: this.clientId,
      reason: 'RESTORE',
    });
  }

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
    if (this.isReadOnly) return;

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
        if (Array.isArray(list)) {
          this.comentarios = [...list];
        }

        this.cdr.detectChanges();

        const last =
          Array.isArray(list) && list.length ? list[list.length - 1] : optimistic;

        this.rt.emit('comentario:nuevo', {
          documentoId: this.documentoId,
          comentario: last,
        });
      },
      error: () => {
        this.comentarios = this.comentarios.filter((c) => c.id !== optimisticId);
        this.cdr.detectChanges();
      },
    });
  }

  markResolved(id: number): void {
    if (this.isReadOnly) return;

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

        this.rt.emit('comentario:resuelto', {
          documentoId: this.documentoId,
          id: cid,
        });
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

  save(): void {
    if (this.isReadOnly) return;

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

          this.error =
            'Hay una versión más reciente del documento. Actualice o revise los cambios antes de guardar.';
        } else {
          this.error = e?.error?.message || 'No se pudo guardar';
        }
      },
    });
  }

  openMetadata(): void {
    if (this.isReadOnly) return;
    this.metadataOpen = true;
  }

  onMetadataSaved(): void {}

  togglePageLayoutPanel(): void {
    this.showPageLayoutPanel = !this.showPageLayoutPanel;
  }

  onLayoutHtmlChange(
    target: 'headerFirst' | 'headerDefault' | 'footerFirst' | 'footerDefault',
    event: Event
  ): void {
    const html = (event.target as HTMLElement).innerHTML || '';

    if (target === 'headerFirst') this.docxHeaderFirstHtml = html;
    if (target === 'headerDefault') this.docxHeaderHtml = html;
    if (target === 'footerFirst') this.docxFooterFirstHtml = html;
    if (target === 'footerDefault') this.docxFooterHtml = html;
  }

  onDifferentFirstPageToggle(): void {
    if (!this.useDifferentFirstPage) {
      this.docxHeaderFirstHtml = '';
      this.docxFooterFirstHtml = '';
    }
  }

  onAutoPageNumberToggle(): void {
    this.docxFooterHtml = this.syncPageNumberToken(this.docxFooterHtml);
    this.docxFooterFirstHtml = this.syncPageNumberToken(this.docxFooterFirstHtml);

    if (!this.autoPageNumberInFooter) return;

    this.docxFooterHtml = `${this.docxFooterHtml}<span class="doc-page-number-token" contenteditable="false"></span>`;

    if (this.useDifferentFirstPage) {
      this.docxFooterFirstHtml = `${this.docxFooterFirstHtml}<span class="doc-page-number-token" contenteditable="false"></span>`;
    }
  }

  onHeaderFooterImageSelected(
    target: 'headerFirst' | 'headerDefault' | 'footerFirst' | 'footerDefault',
    event: Event
  ): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!String(file.type || '').startsWith('image/')) {
      this.error = 'Debe seleccionar una imagen válida.';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const src = String(reader.result || '');
      const imgWidth = this.getImageWidthForTarget(target);

      const imgTag = `<p class="hf-align-left"><img src="${src}" alt="imagen encabezado/pie" data-size-px="${imgWidth}" style="max-height:${imgWidth}px; width:auto; max-width:100%; height:auto; object-fit:contain;" /></p>`;

      if (target === 'headerFirst') {
        this.docxHeaderFirstHtml = `${this.docxHeaderFirstHtml}${imgTag}`;
      }

      if (target === 'headerDefault') {
        this.docxHeaderHtml = `${this.docxHeaderHtml}${imgTag}`;
      }

      if (target === 'footerFirst') {
        this.docxFooterFirstHtml = `${this.docxFooterFirstHtml}${imgTag}`;
      }

      if (target === 'footerDefault') {
        this.docxFooterHtml = `${this.docxFooterHtml}${imgTag}`;
      }
    };

    reader.readAsDataURL(file);
  }

  setHeaderFooterImageSize(
    target: 'headerFirst' | 'headerDefault' | 'footerFirst' | 'footerDefault',
    event: Event
  ): void {
    const value = Number((event.target as HTMLInputElement).value || 60);
    const px = Math.max(40, Math.min(320, value));

    this.imageSizeByTarget[target] = px;
    this.applyImageSizeToTarget(target, px);
  }

  setHeaderFooterImageSizePreset(
    target: 'headerFirst' | 'headerDefault' | 'footerFirst' | 'footerDefault',
    percent: 25 | 50 | 75 | 100
  ): void {
    const px = Math.round((percent / 100) * 320);

    this.imageSizeByTarget[target] = px;
    this.applyImageSizeToTarget(target, px);
  }

  setHeaderFooterImageAlign(
    target: 'headerFirst' | 'headerDefault' | 'footerFirst' | 'footerDefault',
    align: 'left' | 'center' | 'right'
  ): void {
    const applyAlign = (source: string) => {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = String(source || '');

      const paragraphs = Array.from(wrapper.querySelectorAll('p'));

      for (const p of paragraphs) {
        const hasImg = p.querySelector('img');
        if (!hasImg) continue;

        p.classList.remove('hf-align-left', 'hf-align-center', 'hf-align-right');

        p.classList.add(
          align === 'center'
            ? 'hf-align-center'
            : align === 'right'
              ? 'hf-align-right'
              : 'hf-align-left'
        );
      }

      return wrapper.innerHTML;
    };

    if (target === 'headerFirst') {
      this.docxHeaderFirstHtml = applyAlign(this.docxHeaderFirstHtml);
    }

    if (target === 'headerDefault') {
      this.docxHeaderHtml = applyAlign(this.docxHeaderHtml);
    }

    if (target === 'footerFirst') {
      this.docxFooterFirstHtml = applyAlign(this.docxFooterFirstHtml);
    }

    if (target === 'footerDefault') {
      this.docxFooterHtml = applyAlign(this.docxFooterHtml);
    }
  }

  createOrUpdateIndex(): void {
    if (this.isReadOnly) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = this.quill.root.innerHTML;

    wrapper.querySelector('.doc-auto-index')?.remove();

    const headings = Array.from(wrapper.querySelectorAll('h1, h2, h3, h4, h5, h6'));

    if (!headings.length) {
      this.info = '';
      this.error = 'No hay encabezados en el documento para crear el índice.';
      return;
    }

    const indexItems: Array<{
      level: number;
      id: string;
      text: string;
      number: string;
    }> = [];

    const counters = [0, 0, 0, 0, 0, 0];
    let seq = 1;

    for (const heading of headings) {
      const text = String(heading.textContent || '').trim();
      if (!text) continue;

      const level = Number((heading.tagName || 'H1').replace('H', '')) || 1;
      const idx = Math.min(6, Math.max(1, level)) - 1;

      counters[idx] += 1;

      for (let i = idx + 1; i < counters.length; i++) {
        counters[i] = 0;
      }

      const number = counters
        .slice(0, idx + 1)
        .filter((n) => n > 0)
        .join('.');

      const id = `indice-seccion-${seq++}`;

      heading.id = id;
      indexItems.push({ level, id, text, number });
    }

    if (!indexItems.length) {
      this.info = '';
      this.error = 'No hay encabezados válidos para generar índice.';
      return;
    }

    const indexHtml = `
      <section class="doc-auto-index" contenteditable="false">
        <h2>Índice</h2>
        <ul>
          ${indexItems
      .map(
        (item) =>
          `<li class="doc-index-level-${Math.min(
            6,
            Math.max(1, item.level)
          )}"><a href="#${item.id}"><span class="doc-index-num">${
            item.number
          }</span><span class="doc-index-title">${this.escapeHtml(
            item.text
          )}</span><span class="doc-index-dots"></span></a></li>`
      )
      .join('')}
        </ul>
      </section>
      <p><br></p>
    `;

    wrapper.insertAdjacentHTML('afterbegin', indexHtml);

    this.quill.setContents([], 'silent');
    this.quill.clipboard.dangerouslyPasteHTML(0, wrapper.innerHTML, 'api');
    this.quill.setSelection(0, 0, 'silent');

    this.error = '';
    this.info = 'Índice generado correctamente.';

    setTimeout(() => (this.info = ''), 3000);
  }

  openRequestSignatureModal(): void {
    if (this.isReadOnly) return;

    this.requestSigError = '';
    this.sigMsg = '';
    this.error = '';

    this.requestSigModalOpen = true;
    this.requestSigLoading = true;

    this.firmantesQuery = '';
    this.selectedCandidateId = null;
    this.selectedFirmantesList = [];

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

        this.ensureSelectedCandidateStillValid();
      },
      error: (e: any) => {
        this.requestSigLoading = false;
        this.requestSigError = e?.error?.message || 'No se pudieron cargar los usuarios.';
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

  get filteredFirmantes(): UiUser[] {
    const q = this.normalize(this.firmantesQuery);

    if (!q) {
      return this.excludeAlreadySelected(this.firmantes);
    }

    const tokens = q.split(/\s+/).filter(Boolean);

    const filtered = this.firmantes.filter((u) => {
      const hay = this.normalize(u.label);
      return tokens.every((t) => hay.includes(t));
    });

    return this.excludeAlreadySelected(filtered);
  }

  onFirmanteQueryChange(): void {
    this.ensureSelectedCandidateStillValid();
  }

  private ensureSelectedCandidateStillValid(): void {
    if (this.selectedCandidateId == null) return;

    const exists = this.filteredFirmantes.some(
      (u) => u.id === this.selectedCandidateId
    );

    if (!exists) {
      this.selectedCandidateId = null;
    }
  }

  private excludeAlreadySelected(list: UiUser[]): UiUser[] {
    const selectedIds = new Set(this.selectedFirmantesList.map((x) => x.id));
    return list.filter((u) => !selectedIds.has(u.id));
  }

  addSelectedFirmante(): void {
    const id = Number(this.selectedCandidateId);
    if (!id) return;

    const user = this.firmantes.find((u) => u.id === id);
    if (!user) return;

    if (this.selectedFirmantesList.some((x) => x.id === id)) {
      this.selectedCandidateId = null;
      return;
    }

    this.selectedFirmantesList = [...this.selectedFirmantesList, user];
    this.selectedCandidateId = null;

    this.ensureSelectedCandidateStillValid();
  }

  removeFirmante(id: number): void {
    const uid = Number(id);
    if (!uid) return;

    this.selectedFirmantesList = this.selectedFirmantesList.filter(
      (x) => x.id !== uid
    );

    this.ensureSelectedCandidateStillValid();
  }

  confirmRequestSignature(): void {
    if (this.isReadOnly) return;

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
            this.requestSigError = 'Faltan metadatos requeridos. Complete “Metadatos”.';
            this.metadataOpen = true;
            return;
          }

          this.requestSigError = e?.error?.message || 'No se pudo preparar la firma';
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

  async importDocx(evt: Event): Promise<void> {
    if (this.isReadOnly) return;

    const file = (evt.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.error = '';

    this.docs.importDocx(file).subscribe({
      next: (res) => {
        this.pasteHtml(res?.html || '');

        const end = Math.max(0, this.quill.getLength() - 1);
        this.quill.setSelection(end, 0, 'silent');

        /**
         * Importar DOCX reemplaza todo el contenido localmente.
         * No lo mandamos por content:patch automáticamente para evitar pisar a otros.
         * El usuario debe guardar cuando termine de revisar.
         */
      },
      error: (e) => {
        this.error = e?.error?.message || 'No se pudo importar el DOCX.';
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/editor/dashboard']);
  }

  ngOnDestroy(): void {
    this.stopCommentsPolling();

    this.subs.forEach((s) => s.unsubscribe());

    this.quill?.root?.removeEventListener('scroll', this.onEditorScroll);

    /**
     * Limpieza de listeners para evitar duplicados si se entra y sale del editor.
     */
    this.rt.off('presence:update');
    this.rt.off('delta');
    this.rt.off('content:patch');
    this.rt.off('editor:conflict');
    this.rt.off('editor:saved');
    this.rt.off('editor:error');
    this.rt.off('comentario:nuevo');
    this.rt.off('comentario:resuelto');

    if (!this.isReadOnly) {
      this.docs.endSession(this.documentoId).subscribe();
    }
  }

  private html(): string {
    // @ts-ignore
    const bodyHtml =
      // @ts-ignore
      (this.quill as any).getSemanticHTML?.() ?? this.quill.root.innerHTML;

    const headerDefault = this.wrapLayoutSection(
      this.docxHeaderHtml,
      'docx-page-header',
      false
    );

    const footerDefault = this.wrapLayoutSection(
      this.syncPageNumberToken(this.docxFooterHtml),
      'docx-page-footer',
      this.autoPageNumberInFooter
    );

    const headerFirst = this.useDifferentFirstPage
      ? this.wrapLayoutSection(this.docxHeaderFirstHtml, 'docx-page-header-first', false)
      : '';

    const footerFirst = this.useDifferentFirstPage
      ? this.wrapLayoutSection(
        this.syncPageNumberToken(this.docxFooterFirstHtml),
        'docx-page-footer-first',
        this.autoPageNumberInFooter
      )
      : '';

    return `${headerFirst}${headerDefault}${bodyHtml || ''}${footerDefault}${footerFirst}`;
  }

  private pasteHtml(html: string): void {
    const parts = this.splitHeaderFooterFromHtml(html);

    this.useDifferentFirstPage = parts.hasDifferentFirstPage;
    this.autoPageNumberInFooter = parts.autoPageNumberInFooter;
    this.docxHeaderFirstHtml = parts.headerFirstHtml;
    this.docxHeaderHtml = parts.headerHtml;
    this.docxFooterFirstHtml = parts.footerFirstHtml;
    this.docxFooterHtml = parts.footerHtml;

    this.quill.setContents([], 'silent');
    this.quill.clipboard.dangerouslyPasteHTML(0, parts.bodyHtml, 'api');
  }

  /**
   * Se mantiene por si más adelante se necesita una sincronización completa controlada.
   * No se usa para edición colaborativa en vivo.
   */
  private setHtmlPreservingCaretAndScroll(html: string): void {
    const parts = this.splitHeaderFooterFromHtml(html);

    this.useDifferentFirstPage = parts.hasDifferentFirstPage;
    this.autoPageNumberInFooter = parts.autoPageNumberInFooter;
    this.docxHeaderFirstHtml = parts.headerFirstHtml;
    this.docxHeaderHtml = parts.headerHtml;
    this.docxFooterFirstHtml = parts.footerFirstHtml;
    this.docxFooterHtml = parts.footerHtml;

    const sel = this.quill.getSelection();
    const scroller = this.quill.root.parentElement!;
    const prevScrollTop = scroller.scrollTop;

    this.quill.setContents([], 'silent');
    this.quill.clipboard.dangerouslyPasteHTML(0, parts.bodyHtml, 'api');

    if (sel) {
      const max = Math.max(0, this.quill.getLength() - 1);
      const idx = Math.min(sel.index, max);
      const len = Math.min(sel.length ?? 0, Math.max(0, max - idx));

      this.quill.setSelection(idx, len, 'silent');
    }

    scroller.scrollTop = prevScrollTop;
  }

  private splitHeaderFooterFromHtml(html: string): {
    hasDifferentFirstPage: boolean;
    autoPageNumberInFooter: boolean;
    headerFirstHtml: string;
    headerHtml: string;
    bodyHtml: string;
    footerFirstHtml: string;
    footerHtml: string;
  } {
    const source = String(html || '');
    const wrapper = document.createElement('div');

    wrapper.innerHTML = source;

    const headerFirstEl = wrapper.querySelector('.docx-page-header-first');
    const headerEl = wrapper.querySelector('.docx-page-header');
    const footerFirstEl = wrapper.querySelector('.docx-page-footer-first');
    const footerEl = wrapper.querySelector('.docx-page-footer');

    const headerFirstHtml = headerFirstEl ? headerFirstEl.innerHTML : '';
    const headerHtml = headerEl ? headerEl.innerHTML : '';
    const footerFirstHtml = footerFirstEl ? footerFirstEl.innerHTML : '';
    const footerHtml = footerEl ? footerEl.innerHTML : '';

    const autoPageNumberInFooter = Boolean(
      wrapper.querySelector('.doc-page-number-token')
    );

    headerFirstEl?.remove();
    headerEl?.remove();
    footerFirstEl?.remove();
    footerEl?.remove();

    return {
      hasDifferentFirstPage: Boolean(headerFirstHtml || footerFirstHtml),
      autoPageNumberInFooter,
      headerFirstHtml,
      headerHtml,
      bodyHtml: wrapper.innerHTML,
      footerFirstHtml,
      footerHtml,
    };
  }

  private wrapLayoutSection(
    content: string,
    cssClass: string,
    includeAutoPageToken: boolean
  ): string {
    const html = String(content || '').trim();

    const token = includeAutoPageToken
      ? '<span class="doc-page-number-token" contenteditable="false"></span>'
      : '';

    if (!html && !token) return '';

    return `<div class="${cssClass}">${html}${token}</div>`;
  }

  private syncPageNumberToken(html: string): string {
    const source = String(html || '');

    return source.replace(
      /<span class="doc-page-number-token"[^>]*><\/span>/g,
      ''
    );
  }

  getRenderedFooterPreviewHtml(sourceHtml: string, pageNumber: number): string {
    const total = this.estimatedPages;

    return String(sourceHtml || '').replace(
      /<span class="doc-page-number-token"[^>]*><\/span>/g,
      `<span class="doc-page-number-preview">Página ${pageNumber} de ${total}</span>`
    );
  }

  trustHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(String(html || ''));
  }

  get estimatedPages(): number {
    if (!this.quill?.root) return 1;

    const contentHeight = Number(this.quill.root.scrollHeight || 0);

    return Math.max(1, Math.ceil(contentHeight / this.pageVisualHeightPx));
  }

  private getImageWidthForTarget(
    target: 'headerFirst' | 'headerDefault' | 'footerFirst' | 'footerDefault'
  ): number {
    const getLastWidth = (html: string) => {
      const matches = String(html || '').match(/max-height:\s*(\d+)px/g);

      if (!matches?.length) return 60;

      const last = matches[matches.length - 1].match(/(\d+)/);

      return Number(last?.[1] || 60);
    };

    if (target === 'headerFirst') return getLastWidth(this.docxHeaderFirstHtml);
    if (target === 'headerDefault') return getLastWidth(this.docxHeaderHtml);
    if (target === 'footerFirst') return getLastWidth(this.docxFooterFirstHtml);

    return getLastWidth(this.docxFooterHtml);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.estimatedPages }, (_, i) => i + 1);
  }

  get pageBreakNumbers(): number[] {
    return Array.from(
      { length: Math.max(0, this.estimatedPages - 1) },
      (_, i) => i + 2
    );
  }

  getPageMarkerTop(pageNumber: number): number {
    if (pageNumber <= 1) return 0;

    const idx = pageNumber - 1;
    const absoluteTop =
      idx * this.pageVisualHeightPx + (idx - 1) * this.pageGapPx;

    return absoluteTop - this.currentEditorScrollTop;
  }

  private updateCurrentPageFromSelection(): void {
    if (!this.quill) return;

    const sel = this.quill.getSelection();

    if (!sel) {
      this.updateCurrentPageFromScroll();
      return;
    }

    const bounds = this.quill.getBounds(sel.index, sel.length || 0);
    const y = Math.max(0, Number(bounds?.top || 0));
    const page = Math.max(1, Math.floor(y / this.pageVisualHeightPx) + 1);

    this.currentVisualPage = Math.min(page, this.estimatedPages);

    this.cdr.detectChanges();
  }

  private updateCurrentPageFromScroll(): void {
    if (!this.quill?.root) return;

    const top = Math.max(0, Number(this.quill.root.scrollTop || 0));

    this.currentEditorScrollTop = top;

    const page = Math.max(1, Math.floor(top / this.pageVisualHeightPx) + 1);

    this.currentVisualPage = Math.min(page, this.estimatedPages);

    this.cdr.detectChanges();
  }

  private applyImageSizeToTarget(
    target: 'headerFirst' | 'headerDefault' | 'footerFirst' | 'footerDefault',
    px: number
  ): void {
    const resize = (source: string) => {
      const wrapper = document.createElement('div');

      wrapper.innerHTML = String(source || '');

      const imgs = Array.from(wrapper.querySelectorAll('img'));

      imgs.forEach((img) => {
        img.setAttribute('data-size-px', String(px));
        img.style.maxHeight = `${px}px`;
        img.style.width = 'auto';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.objectFit = 'contain';
      });

      return wrapper.innerHTML;
    };

    if (target === 'headerFirst') {
      this.docxHeaderFirstHtml = resize(this.docxHeaderFirstHtml);
    }

    if (target === 'headerDefault') {
      this.docxHeaderHtml = resize(this.docxHeaderHtml);
    }

    if (target === 'footerFirst') {
      this.docxFooterFirstHtml = resize(this.docxFooterFirstHtml);
    }

    if (target === 'footerDefault') {
      this.docxFooterHtml = resize(this.docxFooterHtml);
    }
  }

  private escapeHtml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private fallbackUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;

      return v.toString(16);
    });
  }

  openRestoreModal() {
    if (this.isReadOnly) return;

    this.showRestoreModal = true;
    this.selectedVersionId = null;
    this.restoreMotivo = '';

    this.docs.listVersions(this.documentoId).subscribe({
      next: (rows: VersionDoc[]) => {
        this.versiones = rows;
      },
      error: (e: any) => {
        this.error = e?.error?.message || 'No se pudieron cargar versiones';
      },
    });
  }

  closeRestoreModal() {
    this.showRestoreModal = false;
  }

  selectVersion(v: VersionDoc) {
    this.selectedVersionId = v.id;
  }

  confirmRestore() {
    if (this.isReadOnly) return;
    if (!this.selectedVersionId) return;

    this.restoring = true;

    this.docs
      .restoreVersion(this.documentoId, this.selectedVersionId, this.restoreMotivo || '')
      .subscribe({
        next: (res: any) => {
          this.restoring = false;
          this.showRestoreModal = false;

          if (res?.html != null) {
            this.pasteHtml(res.html);
          }

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
