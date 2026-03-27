import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface DocumentoExterno {
  id: number;
  numero_serie: string;
  titulo: string;
  estado: 'ARCHIVADO';
  fecha: string;
  categoria?: string;
  unidad_nombre?: string;
}

@Component({
  selector: 'app-usuarioexterno-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './usuarioexterno-dashboard.component.html',
  styleUrls: ['./usuarioexterno-dashboard.component.css'],
})
export class UsuarioExternoDashboardComponent implements OnInit {
  documentos: DocumentoExterno[] = [];
  pagedDocuments: DocumentoExterno[] = [];

  page = 1;
  pageSize = 7;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.cargarDocumentosArchivados();
  }

  get totalItems(): number {
    return this.documentos.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get rangeEnd(): number {
    return Math.min(this.page * this.pageSize, this.totalItems);
  }

  cargarDocumentosArchivados(): void {
    this.http.get<DocumentoExterno[]>('http://localhost:3000/documentos/externos').subscribe({
      next: (response) => {
        this.documentos = response;
        this.page = 1;
        this.repage();
      },
      error: (error) => {
        console.error('Error al obtener documentos archivados:', error);
      }
    });
  }

  verDocumento(id: number): void {
    this.router.navigate([`/usuarioexterno/documento/${id}`]);
  }

  goPrev(): void {
    if (this.page <= 1) return;
    this.page--;
    this.repage();
  }

  goNext(): void {
    if (this.page >= this.totalPages) return;
    this.page++;
    this.repage();
  }

  private repage(): void {
    const start = (this.page - 1) * this.pageSize;
    this.pagedDocuments = this.documentos.slice(start, start + this.pageSize);
  }
}
