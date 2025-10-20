import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DocumentService } from '../../../../../core/services/document.service';
import { TemplateSelectorComponent } from '../template/template-selector.component';
import { PlantillaModel } from '../../../../../core/services/plantilla.service';
import { CreateOptionDialogComponent } from './create-option-dialog.component';

const DEFAULT_TEMPLATE_ID = 1; // documento en blanco

@Component({
  standalone: true,
  selector: 'app-editor-create-document',
  imports: [CommonModule, FormsModule, TemplateSelectorComponent, CreateOptionDialogComponent],
  templateUrl: './editor-create-document.component.html',
  styleUrls: ['./editor-create-document.component.css'],
})
export class EditorCreateDocumentComponent implements OnInit {
  titulo = '';
  loading = false;
  error = '';
  fecha = new Date();
  usuarioEmail = '';

  // ✅ Nuevos estados para modales
  showTemplateSelector = false;
  showOptionDialog = false;
  plantillaSeleccionada: PlantillaModel | null = null;

  constructor(private docs: DocumentService, private router: Router) {}

  ngOnInit(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      this.usuarioEmail = user.email || 'usuario@patrimonius.mncr';
    } else {
      this.usuarioEmail = 'usuario@patrimonius.mncr';
    }
  }

  // ✅ Crear documento (abrir modal de opciones)
  crear(): void {
    this.error = '';
    if (!this.titulo.trim()) {
      this.error = 'Debe ingresar un título para el documento';
      return;
    }
    this.showOptionDialog = true; // mostrar modal de opciones
  }

  // ✅ Recibir la elección del modal
  onOptionSelected(option: 'plantilla' | 'sin' | 'cancelar') {
    this.showOptionDialog = false;

    if (option === 'plantilla') {
      this.showTemplateSelector = true; // abrir selector de plantillas
    } else if (option === 'sin') {
      this.crearDocumento(DEFAULT_TEMPLATE_ID); // crear sin plantilla
    } else {
      this.cancelar(); // volver al dashboard
    }
  }

  // ✅ Evento cuando selecciona una plantilla
  onTemplateSelected(p: PlantillaModel | null) {
    this.showTemplateSelector = false;
    if (p) {
      this.plantillaSeleccionada = p;
      this.crearDocumento(p.id);
    }
  }

  // ✅ Crear documento (con o sin plantilla)
  private crearDocumento(plantillaId: number): void {
    this.loading = true;
    this.docs
      .crearDesdePlantilla({
        plantilla_id: plantillaId,
        titulo: this.titulo.trim(),
        confid_level: 'INTERNAL',
      })
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.router.navigate(['/editor/document', res.documento_id, 'edit']);
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'No se pudo crear el documento';
        },
      });
  }

  cancelar(): void {
    this.showTemplateSelector = false;
    this.showOptionDialog = false;
    this.router.navigate(['/editor/dashboard']);
  }
}
