// src/app/editor/dashboard/editor-dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentService, VDocumentModel } from '../../../../core/services/document.service';
import { DatePipe } from '@angular/common';
import { FormatStatePipe } from '../../../pipes/capitalize.pipe';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-editor-dashboard',
  standalone: true,
  imports: [CommonModule, FormatStatePipe, RouterModule],
  templateUrl: './editor-dashboard.component.html',
  styleUrls: ['./editor-dashboard.component.css'],
  providers: [DatePipe],
})
export class EditorDashboardComponent implements OnInit {
  documents: VDocumentModel[] = [];

  statusCounters = [
    { title: 'Documentos en Borrador', count: 1, icon: 'edit.png' },
    { title: 'Pendientes de Firma', count: 4, icon: 'document-signed.png' },
    { title: 'Documentos Firmados Parcialmente', count: 2, icon: 'signature.png' },
    { title: 'Enviados a Conservación', count: 3, icon: 'box.png' },
  ];

  // 🔹 Ahora solo se muestran las opciones principales sin "Con Plantilla"
  overviewCards = [
    { title: 'Crear Documento', description: 'Nuevo documento', icon: 'plus.png' },
    { title: 'Firmar', description: 'Documentos pendientes', icon: 'signature.png' },
    { title: 'Ingresar', description: 'Documentos externos', icon: 'upload.png' },
  ];

  constructor(private documentService: DocumentService, private router: Router) {}

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
      },
    });
  }

  getIconPath(iconName: string): string {
    return `assets/icons/${iconName}`;
  }

  // 🚀 Navegar a la pantalla de crear documento
  goToCreate(): void {
    this.router.navigate(['/editor', 'document', 'create']);
  }

  editarDocumento(documentoId: number): void {
    if (!documentoId) {
      console.error('ID de documento inválido');
      return;
    }
    this.router.navigate(['/editor', 'document', documentoId, 'edit']);
  }
}
