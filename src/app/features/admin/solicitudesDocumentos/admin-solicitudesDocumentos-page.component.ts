import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConsultaAprobadosApiService } from '../../../../core/services/consulta-aprobados-api.service';
import { ToastService } from '../../../shared/ui/toast.service';

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
  private readonly toast = inject(ToastService);

  loading = false;
  errorMsg = '';

  rows: SolicitudDocumentoRow[] = [];
  filteredRows: SolicitudDocumentoRow[] = [];

  docIdFiltro = '';
  docDocumentoFiltro = '';
  docSolicitanteFiltro = '';
  docEstadoFiltro: '' | EstadoSolicitud = '';
  docFechaDesdeFiltro = '';
  docFechaHastaFiltro = '';

  expIdFiltro = '';
  expExpedienteFiltro = '';
  expSolicitanteFiltro = '';
  expEstadoFiltro: '' | EstadoSolicitud = '';
  expFechaDesdeFiltro = '';
  expFechaHastaFiltro = '';

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

  private toUpperValue(value: string | null | undefined): string {
    return String(value || '').toUpperCase();
  }

  onDocIdFiltroInput(): void {
    this.docIdFiltro = this.toUpperValue(this.docIdFiltro);
  }

  onDocDocumentoFiltroInput(): void {
    this.docDocumentoFiltro = this.toUpperValue(this.docDocumentoFiltro);
  }

  onDocSolicitanteFiltroInput(): void {
    this.docSolicitanteFiltro = this.toUpperValue(this.docSolicitanteFiltro);
  }

  onExpIdFiltroInput(): void {
    this.expIdFiltro = this.toUpperValue(this.expIdFiltro);
  }

  onExpExpedienteFiltroInput(): void {
    this.expExpedienteFiltro = this.toUpperValue(this.expExpedienteFiltro);
  }

  onExpSolicitanteFiltroInput(): void {
    this.expSolicitanteFiltro = this.toUpperValue(this.expSolicitanteFiltro);
  }

  onMotivoResolucionInput(): void {
    this.motivoResolucion = this.toUpperValue(this.motivoResolucion);
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
        this.toast.error('No se pudieron cargar las solicitudes de documentos');
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
        this.toast.error('No se pudieron cargar las solicitudes de expedientes');
      },
    });
  }

  applyFilters(): void {
    const id = this.docIdFiltro.trim().toLowerCase();
    const documento = this.docDocumentoFiltro.trim().toLowerCase();
    const solicitante = this.docSolicitanteFiltro.trim().toLowerCase();

    this.filteredRows = this.rows.filter((row) => {
      const matchId =
        !id || String(row.id).toLowerCase().includes(id);

      const documentoTexto = [
        row.documento_titulo,
        row.numero_serie,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchDocumento =
        !documento || documentoTexto.includes(documento);

      const solicitanteTexto = [
        row.solicitante_nombre,
        row.solicitante_apellido1,
        row.solicitante_apellido2,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchSolicitante =
        !solicitante || solicitanteTexto.includes(solicitante);

      const matchEstado =
        !this.docEstadoFiltro || row.estado_solicitud === this.docEstadoFiltro;

      const fecha = row.created_at ? new Date(row.created_at) : null;

      const matchFechaDesde =
        !this.docFechaDesdeFiltro || !fecha
          ? true
          : fecha >= new Date(`${this.docFechaDesdeFiltro}T00:00:00`);

      const matchFechaHasta =
        !this.docFechaHastaFiltro || !fecha
          ? true
          : fecha <= new Date(`${this.docFechaHastaFiltro}T23:59:59`);

      return (
        matchId &&
        matchDocumento &&
        matchSolicitante &&
        matchEstado &&
        matchFechaDesde &&
        matchFechaHasta
      );
    });
  }

  applyFiltersExpedientes(): void {
    const id = this.expIdFiltro.trim().toLowerCase();
    const expediente = this.expExpedienteFiltro.trim().toLowerCase();
    const solicitante = this.expSolicitanteFiltro.trim().toLowerCase();

    this.filteredRowsExpedientes = this.rowsExpedientes.filter((row) => {
      const matchId =
        !id || String(row.id).toLowerCase().includes(id);

      const expedienteTexto = [
        row.expediente_codigo,
        row.expediente_nombre,
        row.serie_nombre,
        row.subserie_nombre,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchExpediente =
        !expediente || expedienteTexto.includes(expediente);

      const solicitanteTexto = [
        row.solicitante_nombre,
        row.solicitante_apellido1,
        row.solicitante_apellido2,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchSolicitante =
        !solicitante || solicitanteTexto.includes(solicitante);

      const matchEstado =
        !this.expEstadoFiltro || row.estado_solicitud === this.expEstadoFiltro;

      const fecha = row.created_at ? new Date(row.created_at) : null;

      const matchFechaDesde =
        !this.expFechaDesdeFiltro || !fecha
          ? true
          : fecha >= new Date(`${this.expFechaDesdeFiltro}T00:00:00`);

      const matchFechaHasta =
        !this.expFechaHastaFiltro || !fecha
          ? true
          : fecha <= new Date(`${this.expFechaHastaFiltro}T23:59:59`);

      return (
        matchId &&
        matchExpediente &&
        matchSolicitante &&
        matchEstado &&
        matchFechaDesde &&
        matchFechaHasta
      );
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

    const motivo = this.toUpperValue(this.motivoResolucion).trim();
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
          this.toast.success(`Solicitud ${estado.toLowerCase()}a correctamente`);
          this.closeDetalle();
          this.load();
        },
        error: (e) => {
          this.resolving = false;
          this.accionError =
            e?.error?.message || 'No se pudo resolver la solicitud.';
          this.toast.error('No se pudo resolver la solicitud');
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
    this.aplicarFiltros();
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

    const motivo = this.toUpperValue(this.motivoResolucion).trim();
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
          this.toast.success(`Solicitud de expediente ${estado.toLowerCase()}a correctamente`);
          this.closeDetalleExpediente();
          this.loadExpedientes();
        },
        error: (e) => {
          this.resolving = false;
          this.accionError =
            e?.error?.message || 'No se pudo resolver la solicitud de expediente.';
          this.toast.error('No se pudo resolver la solicitud de expediente');
        },
      });
  }

  aplicarFiltros(): void {
    if (this.seccionActual === 'documentos') {
      this.applyFilters();
      return;
    }

    this.applyFiltersExpedientes();
  }

  limpiarFiltros(): void {
    this.docIdFiltro = '';
    this.docDocumentoFiltro = '';
    this.docSolicitanteFiltro = '';
    this.docEstadoFiltro = '';
    this.docFechaDesdeFiltro = '';
    this.docFechaHastaFiltro = '';

    this.expIdFiltro = '';
    this.expExpedienteFiltro = '';
    this.expSolicitanteFiltro = '';
    this.expEstadoFiltro = '';
    this.expFechaDesdeFiltro = '';
    this.expFechaHastaFiltro = '';

    this.aplicarFiltros();
  }
}
