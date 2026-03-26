// src/app/features/editor/document/sign/document-sign.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { FormatStatePipe } from '../../../../pipes/capitalize.pipe';
import { DocumentService } from '../../../../../core/services/document.service';

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

// ✅ YA HAY BACKEND, entonces lo activamos
const EXPORTS_ENABLED = true;

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
      next: () => {
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

  // ✅ DESCARGA PDF REAL (Blob -> archivo)
  downloadPdf() {
    if (!this.exportsEnabled) return;

    this.error = null;

    this.docs.downloadPdfForSignature(this.docId).subscribe({
      next: (blob) => {
        const fileBlob = new Blob([blob], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(fileBlob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `documento_${this.docId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();

        window.URL.revokeObjectURL(url);
      },
      error: (err: HttpErrorResponse) => {
        this.error =
          (err?.error?.message as string) || 'No se pudo descargar el PDF.';
      },
    });
  }

  // ✅ DESCARGA DOCX REAL (Blob -> archivo)
  downloadDocx() {
    if (!this.exportsEnabled) return;

    this.error = null;

    this.docs.downloadDocxForSignature(this.docId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `documento_${this.docId}.docx`;
        a.click();

        window.URL.revokeObjectURL(url);
      },
      error: (err: HttpErrorResponse) => {
        this.error = (err?.error?.message as string) || 'No se pudo descargar el DOCX.';
      },
    });
  }
}
