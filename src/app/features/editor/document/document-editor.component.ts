import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-document-editor',
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Editor de documento</h2>
    <textarea rows="12" style="width:100%" [(ngModel)]="content"></textarea>
    <div style="margin-top:8px">
      <button (click)="save()">Guardar</button>
    </div>
  `
})
export class DocumentEditorComponent {
  content = '';
  save() {
    console.log('guardar (stub):', this.content);
  }
}
