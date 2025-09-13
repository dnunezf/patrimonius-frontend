import { Component, OnInit } from '@angular/core';
import { DocumentService } from 'src/core/services/document.service';
import { DocumentModel } from 'src/app/shared/models/document.model';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-editor-dashboard',
  templateUrl: './editor-dashboard.component.html',
  styleUrls: ['./editor-dashboard.component.css'],
  providers: [DatePipe]
})
export class EditorDashboardComponent implements OnInit {
  documentos: DocumentModel[] = [];

  constructor(
    private documentService: DocumentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarDocumentos();
  }

  cargarDocumentos(): void {
    this.documentService.getAll().subscribe({
      next: (data) => this.documentos = data,
      error: (err) => console.error('Error al cargar documentos:', err)
    });
  }

  crearDocumento(): void {
    this.router.navigate(['/editor/crear-documento']);
  }
}
