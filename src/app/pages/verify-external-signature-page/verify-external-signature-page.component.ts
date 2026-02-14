import { Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { CommonModule } from "@angular/common";
import { VerifyExternalSignatureComponent } from "app/features/firma-externa/verify-external-signature/verify-external-signature.component";

@Component({
  selector: "app-verify-external-signature-page",
  standalone: true,
  imports: [CommonModule, VerifyExternalSignatureComponent],
  template: `
    <app-verify-external-signature
      [documentoId]="documentoId"
    ></app-verify-external-signature>
  `,
})
export class VerifyExternalSignaturePageComponent {
  documentoId = 0;

  // constructor(private route: ActivatedRoute) {
  //   const id = Number(this.route.snapshot.paramMap.get("documentoId"));
  //   this.documentoId = Number.isFinite(id) ? id : 0;
  // }
  constructor(private route: ActivatedRoute) {
    this.route.paramMap.subscribe((p) => {
      this.documentoId = Number(p.get("documentoId") || 0);
    });
  }
}
