// src/app/features/editor/document/sign/document-sign.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {FormatStatePipe} from '../../../../pipes/capitalize.pipe';
import {DocumentService} from '../../../../../core/services/document.service';




type SignatureInfo = {
  documento_id: number;
  titulo: string;
  estado: string;
  firmas_requeridas: number;
  firmas_obtenidas: number;
  ya_firmo: boolean;
  puede_firmar: boolean;
  motivo?: string | null;
};

// NOTA: este endpoint lo agregaremos luego en backend.
// Por ahora dejamos el boton, pero lo deshabilitamos si no existe.
const EXPORTS_ENABLED = false;

@Component({
  selector: 'app-document-sign',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FormatStatePipe],
  templateUrl: './document-sign.component.html',
  styleUrls: ['./document-sign.component.css'],
})
export class DocumentSignComponent {
  docId: number;

  loading = false;
  error: string | null = null;

  info: SignatureInfo | null = null;

  selectedPdf: File | null = null;
  confirmLoading = false;
  confirmMsg: string | null = null;

  exportsEnabled = EXPORTS_ENABLED;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private docs: DocumentService
  ) {
    this.docId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadInfo();
  }

  private loadInfo() {
    this.loading = true;
    this.error = null;
    this.info = null;
    this.confirmMsg = null;

    this.docs.getSignatureInfo(this.docId).subscribe({
      next: (r) => {
        this.loading = false;
        this.info = r;

        if (!r?.puede_firmar) {
          this.error = r?.motivo || 'No puedes firmar este documento.';
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.error = (err?.error?.message as string) || 'Error consultando firma.';
      },
    });
  }

  back() {
    this.router.navigate(['/editor/dashboard']);
  }

  onPdfSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      this.error = 'El archivo debe ser un PDF.';
      this.selectedPdf = null;
      return;
    }

    this.error = null;
    this.selectedPdf = file;
  }

  confirmSign() {
    if (!this.docId) return;

    if (!this.selectedPdf) {
      this.error = 'Debes adjuntar el PDF firmado.';
      return;
    }

    this.confirmLoading = true;
    this.error = null;
    this.confirmMsg = null;

    this.docs.confirmSignature(this.docId, this.selectedPdf).subscribe({
      next: (res) => {
        this.confirmLoading = false;
        this.confirmMsg = 'Firma registrada correctamente.';
        this.selectedPdf = null;

        // refrescar estado/firma obtenida
        this.loadInfo();
      },
      error: (err: HttpErrorResponse) => {
        this.confirmLoading = false;
        this.error =
          (err?.error?.message as string) || 'Error confirmando firma.';
      },
    });
  }

  // ====== (para cuando activemos export en backend) ======
  downloadPdf() {
    if (!this.exportsEnabled) return;
    // this.docs.downloadPdf(this.docId).subscribe(...)
  }

  downloadDocx() {
    if (!this.exportsEnabled) return;
    // this.docs.downloadDocx(this.docId).subscribe(...)
  }
}
