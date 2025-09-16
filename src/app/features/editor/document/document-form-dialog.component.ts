// editor-form-dialog.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-document-form-dialog',
  templateUrl: './document-form-dialog.component.html',
  imports: [
    ReactiveFormsModule,CommonModule
  ],
  styleUrls: ['./document-form-dialog.component.css']
})
export class EditorFormDialogComponent {
  @Input() open: boolean = false;  // Controlar la visibilidad del modal
  @Input() categorias: any[] = []; // Datos de las categorías disponibles
  @Output() closed = new EventEmitter<void>();
  @Output() submitForm = new EventEmitter<any>();

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      titulo: ['', Validators.required],
      categoria: ['', Validators.required],
    });
  }

  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal')) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitForm.emit(this.form.value);  // Emite los datos del formulario
  }
}
