import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentService } from '../../../../core/services/document.service';
import { VDocumentModel } from '../../../../core/services/document.service';
import { DatePipe } from '@angular/common';
import { FormatStatePipe } from '../../../pipes/capitalize.pipe';

@Component({
  selector: 'app-editor-dashboard',
  standalone: true,
  imports: [CommonModule , FormatStatePipe],
  templateUrl: './editor-dashboard.component.html',
  styleUrls: ['./editor-dashboard.component.css'],
  providers: [DatePipe]
})
export class EditorDashboardComponent implements OnInit {


  documents: VDocumentModel[] = [];

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

  // Overview cards array
  overviewCards = [
    {
      title: 'Crear Documento',
      description: 'Sin plantilla',
      icon: 'plus.png',
    },
    {
      title: 'Con Plantilla',
      description: 'Tipos predefinidos',
      icon: 'document-signed.png',
      showTemplates: false, // This controls the visibility of the templates
      templates: [
        { name: 'Plantilla 1', description: 'Documento administrativo básico' },
        { name: 'Plantilla 2', description: 'Informe técnico especializado' },
        { name: 'Plantilla 3', description: 'Acta de reunión institucional' }
      ]
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

  selectedTemplate: string = '';

  constructor(private documentService: DocumentService) {

  }

  ngOnInit(): void {
    // Initialization if necessary
    this.loadDocuments();
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

  getIconPath(iconName: string): string {
    return `assets/icons/${iconName}`;
  }

  // Toggle visibility of templates for the selected card
  toggleTemplate(card: any): void {
    card.showTemplates = !card.showTemplates; // Toggle the display of the templates
  }

  // Handle the selection of a template
  selectTemplate(templateName: string, card: any): void {
    this.selectedTemplate = templateName;
    card.showTemplates = false; // Close the dropdown after selection
  }
}
