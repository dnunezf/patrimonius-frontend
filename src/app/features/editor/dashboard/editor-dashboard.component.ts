// src/app/editor/dashboard/editor-dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentService, VDocumentModel } from '../../../../core/services/document.service';
import { DatePipe } from '@angular/common';
import { FormatStatePipe } from '../../../pipes/capitalize.pipe';
import {Router, RouterModule} from '@angular/router';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-editor-dashboard',
  standalone: true,
  imports: [CommonModule, FormatStatePipe, RouterModule],
  templateUrl: './editor-dashboard.component.html',
  styleUrls: ['./editor-dashboard.component.css'],
  providers: [DatePipe]
})
export class EditorDashboardComponent implements OnInit {

  documents: VDocumentModel[] = [];

  statusCounters = [
    { title: 'Documentos en Borrador', count: 1, icon: 'edit.png' },
    { title: 'Pendientes de Firma', count: 4, icon: 'document-signed.png' },
    { title: 'Documentos Firmados Parcialmente', count: 2, icon: 'signature.png' },
    { title: 'Enviados a Conservación', count: 3, icon: 'box.png' }
  ];

  overviewCards = [
    { title: 'Crear Documento', description: 'Sin plantilla', icon: 'plus.png' },
    {
      title: 'Con Plantilla',
      description: 'Tipos predefinidos',
      icon: 'document-signed.png',
      showTemplates: false,
      templates: [
        { name: 'Plantilla 1', description: 'Documento administrativo básico', id: 1 },
        { name: 'Plantilla 2', description: 'Informe técnico especializado', id: 2 },
        { name: 'Plantilla 3', description: 'Acta de reunión institucional', id: 3 }
      ]
    },
    { title: 'Firmar', description: 'Documentos pendientes', icon: 'signature.png' },
    { title: 'Ingresar', description: 'Documentos externos', icon: 'upload.png' }
  ];

  selectedTemplate = '';

  constructor(
    private documentService: DocumentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDocuments();
  }



  loadDocuments(): void {
    this.documentService.getDocumentsFromProduction().subscribe({
      next: (data) => {
        this.documents = data;
      },
      error: (err) => {
        console.error('Error al cargar los documentos', err);
      }
    });
  }

  getIconPath(iconName: string): string {
    return `assets/icons/${iconName}`;
  }

  toggleTemplate(card: any): void {
    card.showTemplates = !card.showTemplates;
  }

  editarDocumento(documentoId: number): void {
    if (!documentoId) {
      console.error('ID de documento inválido');
      return;
    }
    this.router.navigate(['/editor','document', documentoId, 'edit']);
  }
  selectTemplate(templateName: string, card: any): void {
    this.selectedTemplate = templateName;
    card.showTemplates = false;
  }

  // 🚀 Navegar a la pantalla de crear (sin plantilla)
  goToCreate(): void {
    this.router.navigate(['/editor', 'document', 'create']);
  }

  // ✅ Crear documento con plantilla y redirigir a /editor/document/:id/edit
  async crearConPlantilla(plantillaId: number) {
    try {
      const res = await firstValueFrom(
        this.documentService.createDraft('Nuevo documento', plantillaId)
      );
      await this.router.navigate(['/editor', 'document', res.id, 'edit']);
    } catch (e) {
      console.error('No se pudo crear con plantilla', e);
      alert('No se pudo crear el documento');
    }
  }
}
