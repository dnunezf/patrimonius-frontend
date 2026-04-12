import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConsultaAprobadosApiService } from '../../../../core/services/consulta-aprobados-api.service';

type EstadoSolicitud = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

type SolicitudBaseRow = {
  usuario_solicitante_id: number;
  solicitante_nombre?: string | null;
  solicitante_apellido1?: string | null;
  solicitante_apellido2?: string | null;
  admin_nombre?: string | null;
  admin_apellido1?: string | null;
  admin_apellido2?: string | null;
};

type SolicitudDocumentoRow = {
  id: number;
  justificacion: string;
  estado_solicitud: EstadoSolicitud;
  motivo_resolucion: string | null;
  usuario_solicitante_id: number;
  admin_responsable_id: number | null;
  documento_id: number;
  created_at: string;
  updated_at: string;

  solicitante_nombre?: string | null;
  solicitante_apellido1?: string | null;
  solicitante_apellido2?: string | null;
  solicitante_rol?: string | null;

  admin_nombre?: string | null;
  admin_apellido1?: string | null;
  admin_apellido2?: string | null;

  documento_titulo?: string | null;
  documento_estado?: string | null;
  numero_serie?: string | null;
};

type SolicitudExpedienteRow = {
  id: number;
  justificacion: string;
  estado_solicitud: EstadoSolicitud;
  motivo_resolucion: string | null;
  usuario_solicitante_id: number;
  admin_responsable_id: number | null;
  expediente_id: number;
  created_at: string;
  updated_at: string;

  solicitante_nombre?: string | null;
  solicitante_apellido1?: string | null;
  solicitante_apellido2?: string | null;
  solicitante_rol?: string | null;

  admin_nombre?: string | null;
  admin_apellido1?: string | null;
  admin_apellido2?: string | null;

  expediente_codigo?: string | null;
  expediente_nombre?: string | null;
  expediente_estado?: string | null;
  serie_nombre?: string | null;
  subserie_nombre?: string | null;
};

@Component({
  selector: 'app-admin-solicitudesdocumentos-page',
  standalone: true,
  imports: [CommonModule, NgFor, NgIf, FormsModule, RouterLink],
  templateUrl: './admin-solicitudesDocumentos-page.component.html',
  styleUrls: ['./admin-solicitudesDocumentos-page.component.css'],
})
export class AdminSolicitudesDocumentosPageComponent implements OnInit {
  private readonly api = inject(ConsultaAprobadosApiService);

  loading = false;
  errorMsg = '';

  rows: SolicitudDocumentoRow[] = [];
  filteredRows: SolicitudDocumentoRow[] = [];

  estadoFiltro: '' | EstadoSolicitud = '';
  textoFiltro = '';

  detalleOpen = false;
  selected: SolicitudDocumentoRow | null = null;

  resolving = false;
  accionError = '';
  motivoResolucion = '';

  seccionActual: 'documentos' | 'expedientes' = 'documentos';

  rowsExpedientes: SolicitudExpedienteRow[] = [];
  filteredRowsExpedientes: SolicitudExpedienteRow[] = [];

  detalleExpedienteOpen = false;
  selectedExpediente: SolicitudExpedienteRow | null = null;

  ngOnInit(): void {
    this.load();
    this.loadExpedientes();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';

    this.api.listSolicitudesAcceso().subscribe({
      next: (rows: SolicitudDocumentoRow[]) => {
        this.rows = rows ?? [];
        this.applyFilters();
        this.loading = false;
      },
      error: (e) => {
        this.loading = false;
        this.errorMsg =
          e?.error?.message || 'No se pudieron cargar las solicitudes.';
      },
    });
  }

  loadExpedientes(): void {
    this.loading = true;
    this.errorMsg = '';

    this.api.listSolicitudesAccesoExpediente().subscribe({
      next: (rows: SolicitudExpedienteRow[]) => {
        this.rowsExpedientes = rows ?? [];
        this.applyFiltersExpedientes();
        this.loading = false;
      },
      error: (e) => {
        this.loading = false;
        this.errorMsg =
          e?.error?.message || 'No se pudieron cargar las solicitudes de expediente.';
      },
    });
  }

  applyFilters(): void {
    const texto = this.textoFiltro.trim().toLowerCase();

    this.filteredRows = this.rows.filter((row) => {
      const matchEstado = !this.estadoFiltro || row.estado_solicitud === this.estadoFiltro;

      const fullText = [
        row.id,
        row.documento_titulo,
        row.numero_serie,
        row.solicitante_nombre,
        row.solicitante_apellido1,
        row.solicitante_apellido2,
        row.solicitante_rol,
        row.justificacion,
        row.motivo_resolucion,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchTexto = !texto || fullText.includes(texto);

      return matchEstado && matchTexto;
    });
  }

  applyFiltersExpedientes(): void {
    const texto = this.textoFiltro.trim().toLowerCase();

    this.filteredRowsExpedientes = this.rowsExpedientes.filter((row) => {
      const matchEstado =
        !this.estadoFiltro || row.estado_solicitud === this.estadoFiltro;

      const fullText = [
        row.id,
        row.expediente_codigo,
        row.expediente_nombre,
        row.expediente_estado,
        row.serie_nombre,
        row.subserie_nombre,
        row.solicitante_nombre,
        row.solicitante_apellido1,
        row.solicitante_apellido2,
        row.solicitante_rol,
        row.justificacion,
        row.motivo_resolucion,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchTexto = !texto || fullText.includes(texto);

      return matchEstado && matchTexto;
    });
  }

  openDetalle(row: SolicitudDocumentoRow): void {
    this.selected = row;
    this.detalleOpen = true;
    this.accionError = '';
    this.motivoResolucion = row.motivo_resolucion ?? '';
  }

  closeDetalle(): void {
    this.detalleOpen = false;
    this.selected = null;
    this.accionError = '';
    this.motivoResolucion = '';
  }

  resolver(estado: 'APROBADA' | 'RECHAZADA'): void {
    if (!this.selected) return;

    const motivo = this.motivoResolucion.trim();
    if (!motivo) {
      this.accionError = 'Debe indicar el motivo de resolución.';
      return;
    }

    this.resolving = true;
    this.accionError = '';

    this.api
      .resolverSolicitudAcceso(this.selected.id, {
        estado_solicitud: estado,
        motivo_resolucion: motivo,
      })
      .subscribe({
        next: () => {
          this.resolving = false;
          this.closeDetalle();
          this.load();
        },
        error: (e) => {
          this.resolving = false;
          this.accionError =
            e?.error?.message || 'No se pudo resolver la solicitud.';
        },
      });
  }

  estadoClass(estado: EstadoSolicitud): string {
    switch (estado) {
      case 'APROBADA':
        return 'badge ok';
      case 'RECHAZADA':
        return 'badge danger';
      default:
        return 'badge warn';
    }
  }

  nombreSolicitante(row: SolicitudBaseRow): string {
    return [
      row.solicitante_nombre,
      row.solicitante_apellido1,
      row.solicitante_apellido2,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() || `Usuario #${row.usuario_solicitante_id}`;
  }

  nombreAdmin(row: SolicitudBaseRow): string {
    return [
      row.admin_nombre,
      row.admin_apellido1,
      row.admin_apellido2,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Pendiente';
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);

    return d.toLocaleString('es-CR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  cambiarSeccion(seccion: 'documentos' | 'expedientes'): void {
    this.seccionActual = seccion;

    if (seccion === 'documentos') {
      this.applyFilters();
      return;
    }

    this.applyFiltersExpedientes();
  }

  onFiltersChange(): void {
    if (this.seccionActual === 'documentos') {
      this.applyFilters();
      return;
    }

    this.applyFiltersExpedientes();
  }

  openDetalleExpediente(row: SolicitudExpedienteRow): void {
    this.selectedExpediente = row;
    this.detalleExpedienteOpen = true;
    this.accionError = '';
    this.motivoResolucion = row.motivo_resolucion ?? '';
  }

  closeDetalleExpediente(): void {
    this.detalleExpedienteOpen = false;
    this.selectedExpediente = null;
    this.accionError = '';
    this.motivoResolucion = '';
  }

  resolverExpediente(estado: 'APROBADA' | 'RECHAZADA'): void {
    if (!this.selectedExpediente) return;

    const motivo = this.motivoResolucion.trim();
    if (!motivo) {
      this.accionError = 'Debe indicar el motivo de resolución.';
      return;
    }

    this.resolving = true;
    this.accionError = '';

    this.api
      .resolverSolicitudAccesoExpediente(this.selectedExpediente.id, {
        estado_solicitud: estado,
        motivo_resolucion: motivo,
      })
      .subscribe({
        next: () => {
          this.resolving = false;
          this.closeDetalleExpediente();
          this.loadExpedientes();
        },
        error: (e) => {
          this.resolving = false;
          this.accionError =
            e?.error?.message || 'No se pudo resolver la solicitud de expediente.';
        },
      });
  }
}
