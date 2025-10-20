import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-create-option-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './create-option-dialog.component.html',
  styleUrls: ['./create-option-dialog.component.css']
})
export class CreateOptionDialogComponent {
  @Output() optionSelected = new EventEmitter<'plantilla' | 'sin' | 'cancelar'>();

  elegir(opcion: 'plantilla' | 'sin' | 'cancelar') {
    this.optionSelected.emit(opcion);
  }
}
