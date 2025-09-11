import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-document-cycle-dialog',
  templateUrl: './document-cycle-dialog.component.html',
  styleUrls: ['./document-cycle-dialog.component.css']
})
export class DocumentCycleDialogComponent {
  @Input() showDetail: boolean = false;
  @Input() detailLoading: boolean = false;
  @Input() detailError: string | null = null;
  @Input() detail: any = null;

  closeDetail() {
    this.showDetail = false;
  }
}
