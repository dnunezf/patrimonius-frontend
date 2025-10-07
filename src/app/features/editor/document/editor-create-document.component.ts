import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DocumentService } from 'core/services/document.service';
import { TemplateSelectorComponent } from './template-selector.component'; // ✅ agregado
import { PlantillaModel } from 'core/services/plantilla.service'; // ✅ agregado

const DEFAULT_TEMPLATE_ID = 1; // documento en blanco

@Component({
  standalone: true,
  selector: 'app-editor-create-document',
  imports: [CommonModule, FormsModule, TemplateSelectorComponent], // ✅ agregado
  templateUrl: './editor-create-document.component.html',
  styleUrls: ['./editor-create-document.component.css'],
})
export class EditorCreateDocumentComponent implements OnInit {
  titulo = '';
  loading = false;
  error = '';
  fecha = new Date();
  usuarioEmail = '';

  // ✅ NUEVO
  showTemplateSelector = false;
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

  // ✅ Paso 2: preguntar si usar plantilla
  async preguntarUsoPlantilla(): Promise<boolean> {
    return new Promise((resolve) => {
      const usar = confirm('¿Desea crear el documento usando una plantilla existente?');
      resolve(usar);
    });
  }

  // ✅ Evento cuando selecciona una plantilla
  onTemplateSelected(p: PlantillaModel | null) {
    this.showTemplateSelector = false;
    if (p) {
      this.plantillaSeleccionada = p;
      this.crearDocumento(p.id);
    }
  }

  // ✅ Crear documento (ya sea con o sin plantilla)
  crear(): void {
    this.error = '';
    if (!this.titulo.trim()) {
      this.error = 'Debe ingresar un título para el documento';
      return;
    }

    this.preguntarUsoPlantilla().then((usarPlantilla) => {
      if (usarPlantilla) {
        // Abre el modal para elegir plantilla
        this.showTemplateSelector = true;
      } else {
        // Crea documento en blanco como hasta ahora
        this.crearDocumento(DEFAULT_TEMPLATE_ID);
      }
    });
  }

  // ✅ Lógica común para crear
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
}
