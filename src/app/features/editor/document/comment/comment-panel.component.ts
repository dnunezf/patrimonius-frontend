import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-comment-panel',
  imports: [CommonModule, FormsModule],
  templateUrl: './comment-panel.component.html',
  styleUrls: ['./comment-panel.component.css']
})
export class CommentPanelComponent {
  @Input() open = false;
  @Input() comentarios: any[] = [];
  @Input() presence: any[] = [];
  @Output() add = new EventEmitter<string>();
  @Output() resolve = new EventEmitter<number>();
  @Output() close = new EventEmitter<void>();

  nuevoComentario = '';

  onAdd() {
    if (!this.nuevoComentario.trim()) return;
    this.add.emit(this.nuevoComentario.trim());
    this.nuevoComentario = '';
  }

  onResolve(id: number) {
    this.resolve.emit(id);
  }
}
