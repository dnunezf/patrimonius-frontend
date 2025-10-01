import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DocumentService } from 'core/services/document.service';

const BLANK_TEMPLATE_ID = 1; // asegúrate de tener esta plantilla en BD

@Component({
  standalone: true,
  selector: 'app-editor-create-document',
  imports: [CommonModule, FormsModule],
  templateUrl: './editor-create-document.component.html',
  styleUrls: ['./editor-create-document.component.css']
})
export class EditorCreateDocumentComponent {
  titulo = '';          // <-- usado en el input
  numero_firmas = 0;    // <-- usado en el input number
  loading = false;      // <-- usado en el botón y el span
  error = '';           // <-- usado en el div de error

  constructor(private docs: DocumentService, private router: Router) {}

  crear(): void {
    this.error = '';
    this.loading = true;

    this.docs.crearDesdePlantilla({
      plantilla_id: BLANK_TEMPLATE_ID,
      titulo: this.titulo.trim(),
      confid_level: 'INTERNAL',
      numero_firmas: this.numero_firmas || 0
    }).subscribe({
      next: (res) => {
        this.loading = false;
        this.router.navigate(['/editor/document', res.documento_id, 'edit']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'No se pudo crear el documento';
      }
    });
  }
}
