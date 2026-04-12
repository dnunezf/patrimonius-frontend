import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface IndiceRow {
  id: number;
  hash: string;
  fecha: string;
  firma_id?: number | null;
  expediente_id: number;
  expediente_codigo?: string;
  expediente_nombre?: string;
  expediente_estado?: string;
  json_path?: string | null;
  acta_pdf_path?: string | null;
}

@Component({
  selector: 'app-archivista-indices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './archivista-indices.component.html',
  styleUrls: ['./archivista-indices.component.css'],
})
export class ArchivistaIndicesComponent implements OnInit {
  private readonly apiUrl = 'http://localhost:3000';

  indices: IndiceRow[] = [];
  filteredIndices: IndiceRow[] = [];

  filtroId = '';
  filtroExpediente = '';
  filtroCodigo = '';
  filtroHash = '';
  filtroFechaDesde = '';
  filtroFechaHasta = '';
  loadingIndices = false;
  errorIndices = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarIndices();
  }

  cargarIndices(): void {
    this.loadingIndices = true;
    this.errorIndices = '';

    this.http.get<IndiceRow[]>(`${this.apiUrl}/indices`).subscribe({
      next: (response) => {
        this.indices = response ?? [];
        this.aplicarFiltroIndices();
        this.loadingIndices = false;
      },
      error: (error) => {
        this.errorIndices = 'No se pudieron cargar los índices electrónicos.';
        this.loadingIndices = false;
        console.error('Error al obtener índices:', error);
      },
    });
  }

  aplicarFiltroIndices(): void {
    const idQ = this.filtroId.trim();
    const expedienteQ = this.filtroExpediente.trim().toLowerCase();
    const codigoQ = this.filtroCodigo.trim().toLowerCase();
    const hashQ = this.filtroHash.trim().toLowerCase();

    this.filteredIndices = this.indices.filter((i) => {
      const matchId =
        !idQ || (/^\d+$/.test(idQ) && i.id === Number(idQ));

      const matchExpediente =
        !expedienteQ ||
        String(i.expediente_nombre ?? '').toLowerCase().includes(expedienteQ);

      const matchCodigo =
        !codigoQ ||
        String(i.expediente_codigo ?? '').toLowerCase().includes(codigoQ);

      const matchHash =
        !hashQ ||
        String(i.hash ?? '').toLowerCase().includes(hashQ);

      const fecha = i.fecha ? new Date(i.fecha) : null;

      const matchFechaDesde =
        !this.filtroFechaDesde || !fecha
          ? true
          : fecha >= new Date(`${this.filtroFechaDesde}T00:00:00`);

      const matchFechaHasta =
        !this.filtroFechaHasta || !fecha
          ? true
          : fecha <= new Date(`${this.filtroFechaHasta}T23:59:59`);

      return (
        matchId &&
        matchExpediente &&
        matchCodigo &&
        matchHash &&
        matchFechaDesde &&
        matchFechaHasta
      );
    });
  }
  limpiarFiltros(): void {
    this.filtroId = '';
    this.filtroExpediente = '';
    this.filtroCodigo = '';
    this.filtroHash = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.aplicarFiltroIndices();
  }

  formatDate(value?: string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-CR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  shortHash(hash?: string | null): string {
    if (!hash) return '—';
    if (hash.length <= 18) return hash;
    return `${hash.slice(0, 12)}...${hash.slice(-6)}`;
  }

  descargarArchivo(relativePath?: string | null): void {
    if (!relativePath) return;

    const url = `${this.apiUrl}/${relativePath}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = relativePath.split('/').pop() || 'archivo';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  verPdf(relativePath?: string | null): void {
    if (!relativePath) return;
    const url = `${this.apiUrl}/${relativePath}`;
    window.open(url, '_blank');
  }
}
