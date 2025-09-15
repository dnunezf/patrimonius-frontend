import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-document-cycle-dialog',
  templateUrl: './document-cycle-dialog.component.html',
  styleUrls: ['./document-cycle-dialog.component.css'],
  standalone: true,
  imports: [CommonModule]
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
