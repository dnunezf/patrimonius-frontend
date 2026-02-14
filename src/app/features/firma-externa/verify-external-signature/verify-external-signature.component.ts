import { Component, Input } from "@angular/core";
import { FirmaExternalService, ExternalVerifyResponse } from "core/services/firmaExternal.service";
import { CommonModule, JsonPipe } from "@angular/common";

@Component({
  selector: "app-verify-external-signature",
  standalone: true,
  imports: [CommonModule, JsonPipe],
  templateUrl: "./verify-external-signature.component.html",
})
export class VerifyExternalSignatureComponent {
  @Input() documentoId!: number; // lo pasás desde el padre o por route param

  docFile: File | null = null;
  certFile: File | null = null;

  loading = false;
  errorMsg: string | null = null;
  result: ExternalVerifyResponse | null = null;

  latestItem: any = null;
  historyItems: any[] = [];
  historyLimit = 10;
  historyOffset = 0;
  historyLoading = false;

  constructor(private firmaExternal: FirmaExternalService) {}

  onDocChange(ev: Event) {
    const input = ev.target as HTMLInputElement;
    this.docFile = input.files?.[0] || null;
  }

  onCertChange(ev: Event) {
    const input = ev.target as HTMLInputElement;
    this.certFile = input.files?.[0] || null;
  }

  verify() {
    this.errorMsg = null;
    this.result = null;

    if (!this.documentoId) {
      this.errorMsg = "Falta documentoId.";
      return;
    }
    if (!this.docFile || !this.certFile) {
      this.errorMsg = "Debés adjuntar el documento y el certificado.";
      return;
    }

    this.loading = true;

    this.firmaExternal.verify(this.documentoId, this.docFile, this.certFile).subscribe({
      next: (res: ExternalVerifyResponse) => {
        this.result = res;
        this.loading = false;
      },
      error: (e: { msg?: string }) => {
        this.errorMsg = e?.msg || "Error verificando firma externa";
        this.loading = false;
      },

    });
  }

  badgeClass(estado?: string) {
    if (!estado) return "badge";
    if (estado === "VALIDA") return "badge ok";
    return "badge bad";
  }
  loadLatest() {
    if (!this.documentoId) return;
    this.errorMsg = null;
    this.firmaExternal.latest(this.documentoId).subscribe({
      next: (r: { item: any }) => (this.latestItem = r.item),
      error: (e: { msg?: string }) => (this.errorMsg = e?.msg || "Error cargando latest"),
    });
  }

  loadHistory(reset = false) {
    if (!this.documentoId) return;
    this.errorMsg = null;

    if (reset) {
      this.historyOffset = 0;
      this.historyItems = [];
    }

    this.historyLoading = true;

    this.firmaExternal.history(this.documentoId, this.historyLimit, this.historyOffset).subscribe({
      next: (r: { items: any[] }) => {
        const newItems = r.items || [];
        this.historyItems = [...this.historyItems, ...newItems];
        this.historyOffset += this.historyLimit;
        this.historyLoading = false;
      },
      error: (e: { msg?: string }) => {
        this.errorMsg = e?.msg || "Error cargando history";
        this.historyLoading = false;
      },
    });
  }


}
