// src/app/features/editor/dashboard/editor-dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import {Categoria, DocumentService} from '../../../../core/services/document.service';
import { VDocumentModel } from '../../../../core/services/document.service';
import {CommonModule, DatePipe} from '@angular/common';
import { FormatStatePipe } from '../../../pipes/capitalize.pipe';
import {EditorFormDialogComponent} from '../document/document-form-dialog.component';
import { Router } from '@angular/router';

// Definir el tipo para las plantillas
interface Template {
  name: string;
  description: string;
}

@Component({
  selector: 'app-editor-dashboard',
  imports: [CommonModule, FormatStatePipe,EditorFormDialogComponent],
  templateUrl: './editor-dashboard.component.html',
  styleUrls: ['./editor-dashboard.component.css'],
  providers: [DatePipe]
})
export class EditorDashboardComponent implements OnInit {
  openFormDialog: boolean = false;
  selectedTemplate: any; // otra opción selectedTemplate: string = '';
  categorias: Categoria[] = [];
  documents: VDocumentModel[] = [];
  plantillas: any[] = [];  // Para almacenar las plantillas que se obtienen desde el backend

  // Status counters array
  statusCounters = [
    {
      title: 'Documentos en Borrador',
      count: 1,
      icon: 'edit.png',
    },
    {
      title: 'Pendientes de Firma',
      count: 4,
      icon: 'document-signed.png',
    },
    {
      title: 'Documentos Firmados Parcialmente',
      count: 2,
      icon: 'signature.png',
    },
    {
      title: 'Enviados a Conservación',
      count: 3,
      icon: 'box.png',
    }
  ];

  // Overview cards array (actualizado con tipo explícito para templates)
  overviewCards = [
    {
      title: 'Crear Documento Con Plantilla',
      description: 'Tipos predefinidos',
      icon: 'document-signed.png',
      showTemplates: false,
      templates: [] as Template[]  // Definir el tipo de las plantillas explícitamente
    },
    {
      title: 'Firmar',
      description: 'Documentos pendientes',
      icon: 'signature.png',
    },
    {
      title: 'Ingresar',
      description: 'Documentos externos',
      icon: 'upload.png',
    }
  ];



  //constructor(private documentService: DocumentService) {}
  constructor(private documentService: DocumentService, private router: Router) {}

  ngOnInit(): void {
    this.loadDocuments();
    this.loadTemplates();  // Cargar las plantillas desde el backend
    this.loadCategorias();
  }

  loadDocuments(): void {
    this.documentService.getDocumentsFromProduction().subscribe({
      next: (data) => {
        console.log('Datos obtenidos del backend:', data);
        this.documents = data;
        console.log('Documents array:', this.documents);
      },
      error: (err) => {
        console.error('Error al cargar los documentos', err);
      }
    });
  }
  loadCategorias(): void {
    this.documentService.getCategorias().subscribe({
      next: (cats) => {
        console.log('Categorías obtenidas:', cats);
        this.categorias = cats;
      },
      error: (err) => {
        console.error('Error al cargar categorías', err);
      }
    });
  }

  loadTemplates(): void {
    this.documentService.getPlantillas().subscribe({
      next: (data) => {
        console.log('Plantillas obtenidas:', data);
        this.plantillas = data;  // Guardar las plantillas obtenidas
        this.updateTemplateCards();  // Actualizar las tarjetas con las plantillas
      },
      error: (err) => {
        console.error('Error al cargar las plantillas', err);
      }
    });
  }

  updateTemplateCards(): void {
    // Asigna las plantillas a la tarjeta "Crear Documento con Plantilla"
    this.overviewCards[0].templates = this.plantillas.map((plantilla: any) => ({
      name: plantilla.nombre, // Asignamos el nombre de la plantilla
      description: plantilla.descripcion
    }));
  }

  // Métodos adicionales
  getIconPath(iconName: string): string {
    return `assets/icons/${iconName}`;
  }

  toggleTemplate(card: any): void {
    card.showTemplates = !card.showTemplates; // Toggle la visibilidad de las plantillas
  }

  selectTemplate(templateName: string, card: any): void {
    this.selectedTemplate = templateName;
    card.showTemplates = false; // Cerrar el desplegable después de la selección
  }
  onTemplateClick(template: any): void {
    this.selectedTemplate = template;
    this.openFormDialog = true;
    console.log('Se creó el dialog');// Abre el modal
  }
  closeFormDialog(): void {
    this.openFormDialog = false;  // Cierra el modal
  }

  handleFormSubmit(formData: any): void {
    // Lógica para manejar los datos del formulario una vez enviados
    this.documentService.createFromForm({
      titulo: formData.titulo,
      categoria_id: formData.categoria,
      plantilla_id: this.selectedTemplate?.id
    }).subscribe({
      next: (created) => {
        console.log('Documento creado:', created);
        this.closeFormDialog();
        // de momento seguimos mostrando la página en blanco
        this.router.navigate(['/editor/create']);
      },
      error: (err) => {
        console.error('Error creando documento:', err);
        // aquí puedes mostrar un snackbar o alerta de error si quieres
      }
    });
    //console.log('Datos del formulario:', formData);
    //this.closeFormDialog();
    //this.router.navigate(['/editor/create']);
  }
}
