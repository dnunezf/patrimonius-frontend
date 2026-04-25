import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  DocumentModel,
  DocumentMetadata,
  DocumentService,
} from 'core/services/document.service';

type DocumentoGeneralData = {
  id: number;
  codigo: string;
  titulo: string;
  tipoDocumental: string;
  autorProductor: string;
  unidadProductora: string;
  fechaCreacion: string | null;
  fechaRecepcion: string | null;
  estadoActual: string;
  descripcion: string;
  palabrasClave: string[];
  serie: string;
  subserie: string;
  expediente: string;
  nivelAcceso: string;
  tamanoArchivo: string;
  formato: string;
  softwareAplicacion: string;
};

type EstadoClasificacionTab =
  | 'cuadro'
  | 'descriptivos'
  | 'tecnicos'
  | 'gestion';


@Component({
  selector: 'app-archivista-clasificacion-documento',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './archivista-clasificacion-documento.component.html',
  styleUrls: ['./archivista-clasificacion-documento.component.css'],
})



export class ArchivistaClasificacionDocumentoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly documentService = inject(DocumentService);

  loading = true;
  errorMsg = '';
  documentoId = 0;
  origenRuta = '';

  documento: DocumentoGeneralData = {
    id: 0,
    codigo: '',
    titulo: '',
    tipoDocumental: '',
    autorProductor: '',
    unidadProductora: '',
    fechaCreacion: null,
    fechaRecepcion: null,
    estadoActual: '',
    descripcion: '',
    palabrasClave: [],
    serie: '',
    subserie: '',
    expediente: '',
    nivelAcceso: '',
    tamanoArchivo: '',
    formato: '',
    softwareAplicacion: '',
  };

  resumen = {
    cuadroCompleto: false,
    descriptivosCompletos: false,
    tecnicosCompletos: false,
    gestionCompleta: false,
  };

  faltantes = {
    cuadro: [] as string[],
    descriptivos: [] as string[],
    tecnicos: [] as string[],
    gestion: [] as string[],
  };

  contextoRuta = {
    serieNombre: '',
    subserieNombre: '',
    expedienteNombre: '',
  };


  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    const state = history.state ?? {};
    this.contextoRuta = {
      serieNombre: state.serieNombre || '',
      subserieNombre: state.subserieNombre || '',
      expedienteNombre: state.expedienteNombre || '',
    };

    this.origenRuta = state.origen || '';

    if (!Number.isFinite(id) || id <= 0) {
      this.errorMsg = 'ID de documento inválido.';
      this.loading = false;
      return;
    }

    this.documentoId = id;
    this.cargarDetalle(id);
  }

  volver(): void {
    if (
      this.origenRuta === 'preview-consulta' ||
      this.origenRuta === 'consulta-externo' ||
      this.origenRuta === 'consulta-expediente-externo'
    ) {
      this.router.navigate(['/consulta/aprobados-externo']);
      return;
    }

    if (
      this.origenRuta === 'consulta-interno' ||
      this.origenRuta === 'consulta-expediente-interno'
    ) {
      this.router.navigate(['/consulta/aprobados']);
      return;
    }

    this.router.navigate(['/archivista/clasificacion']);
  }

  private cargarDetalle(id: number): void {
    this.loading = true;
    this.errorMsg = '';

    forkJoin({
      doc: this.documentService.getContenido(id).pipe(
        catchError((error) => {
          console.error('Error al cargar documento:', error);
          return of(null);
        }),
      ),
      metadata: this.documentService.getMetadata(id).pipe(
        catchError((error) => {
          console.error('Error al cargar metadata:', error);
          return of(null);
        }),
      ),
    }).subscribe({
      next: ({ doc, metadata }) => {
        if (!doc) {
          this.errorMsg = 'No se pudo cargar el detalle del documento.';
          this.loading = false;
          return;
        }

        this.documento = this.mapDocumento(doc, metadata);
        const resultadoResumen = this.buildResumen(metadata);

        this.resumen = {
          cuadroCompleto: resultadoResumen.cuadroCompleto,
          descriptivosCompletos: resultadoResumen.descriptivosCompletos,
          tecnicosCompletos: resultadoResumen.tecnicosCompletos,
          gestionCompleta: resultadoResumen.gestionCompleta,
        };

        this.faltantes = resultadoResumen.faltantes;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando detalle de clasificación:', error);
        this.errorMsg = 'Ocurrió un error al cargar la clasificación del documento.';
        this.loading = false;
      },
    });
  }

  private mapDocumento(
    doc: any,
    metadata: DocumentMetadata | null,
  ): DocumentoGeneralData {
    const automatic: any = metadata?.automatic ?? {};
    const manual: any = metadata?.manual ?? {};

    const titulo =
      manual.title?.trim() ||
      doc.titulo?.trim() ||
      'Sin título';

    const codigo =
      automatic.identifier?.trim() ||
      `DOC-${doc.documento_id}`;

    const tipoDocumental =
      manual.documentType?.trim() || 'No definido';

    const autorProductor =
      automatic.creationResponsible?.trim() || 'No disponible';

    const unidadProductora =
      automatic.producerUnitName?.trim() || 'No disponible';

    const fechaCreacion =
      automatic.createdAt || null;

    const fechaRecepcion =
      automatic.approvedAt ||
      automatic.modifiedAt ||
      null;

    const estadoActual =
      doc.estado || 'No disponible';

    const descripcion =
      this.extraerDescripcion(doc.contenido) || 'Sin descripción registrada.';

    const palabrasClave = Array.isArray(manual.keywords)
      ? manual.keywords.filter((k: any) => String(k || '').trim())
      : [];

    const serie =
      automatic.serieNombre ||
      automatic.serie ||
      this.contextoRuta.serieNombre ||
      'Sin serie';

    const subserie =
      automatic.subserieNombre ||
      automatic.subserie ||
      this.contextoRuta.subserieNombre ||
      'No aplica';

    const expediente =
      automatic.expedienteNombre ||
      automatic.expedienteCodigo ||
      automatic.expediente ||
      this.contextoRuta.expedienteNombre ||
      'Sin expediente';

    const nivelAcceso =
      manual.accessLevel ||
      automatic.accessLevel ||
      'No definido';

    const tamanoArchivo = this.formatearTamano(automatic.sizeBytes);

    const formato =
      automatic.format?.trim() ||
      'No disponible';

    const softwareAplicacion =
      automatic.softwareApplication?.trim() ||
      'No disponible';

    return {
      id: Number(doc.documento_id),
      codigo,
      titulo,
      tipoDocumental,
      autorProductor,
      unidadProductora,
      fechaCreacion,
      fechaRecepcion,
      estadoActual,
      descripcion,
      palabrasClave,
      serie,
      subserie,
      expediente,
      nivelAcceso,
      tamanoArchivo,
      formato,
      softwareAplicacion,
    };
  }

  private extraerDescripcion(html: string | null | undefined): string {
    const raw = String(html || '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!raw) return '';
    return raw.length > 220 ? `${raw.slice(0, 220)}...` : raw;
  }

  private buildResumen(metadata: DocumentMetadata | null) {
    const automatic: any = metadata?.automatic ?? {};
    const manual: any = metadata?.manual ?? {};

    const faltantesCuadro: string[] = [];
    const faltantesDescriptivos: string[] = [];
    const faltantesTecnicos: string[] = [];
    const faltantesGestion: string[] = [];
    const advertenciasDescriptivos: string[] = [];

    const tieneSerie = Boolean(
      automatic.serieId ||
      automatic.serieNombre ||
      automatic.serie ||
      this.contextoRuta.serieNombre,
    );

    const tieneExpediente = Boolean(
      automatic.expedienteId ||
      automatic.expedienteNombre ||
      automatic.expedienteCodigo ||
      automatic.expediente ||
      this.contextoRuta.expedienteNombre,
    );

    if (!tieneSerie) faltantesCuadro.push('Serie');
    if (!tieneExpediente) faltantesCuadro.push('Expediente');

    const tieneTitulo = Boolean(
      manual.title && String(manual.title).trim(),
    );

    const tieneTipoDocumental = Boolean(
      manual.documentType && String(manual.documentType).trim(),
    );

    const tienePalabrasClave = Boolean(
      Array.isArray(manual.keywords) &&
      manual.keywords.filter((k: any) => String(k || '').trim()).length > 0,
    );

    if (!tieneTitulo) faltantesDescriptivos.push('Título');
    if (!tieneTipoDocumental) faltantesDescriptivos.push('Tipo documental');

    // Opcional: no bloquea, solo avisa
    if (!tienePalabrasClave) advertenciasDescriptivos.push('Palabras clave');

    const tieneIdentificador = Boolean(
      automatic.identifier && String(automatic.identifier).trim(),
    );

    const tieneTamano = Boolean(
      automatic.sizeBytes !== null &&
      automatic.sizeBytes !== undefined &&
      String(automatic.sizeBytes).trim() !== '',
    );

    const tieneSoftware = Boolean(
      automatic.softwareApplication &&
      String(automatic.softwareApplication).trim(),
    );

    const tieneFormato = Boolean(
      automatic.format && String(automatic.format).trim(),
    );

    const totalTecnicos = [
      tieneIdentificador,
      tieneTamano,
      tieneSoftware || tieneFormato,
    ].filter(Boolean).length;

    if (!tieneIdentificador) faltantesTecnicos.push('Identificador');
    if (!tieneTamano) faltantesTecnicos.push('Tamaño');
    if (!tieneSoftware && !tieneFormato) {
      faltantesTecnicos.push('Software o formato');
    }

    const tieneUnidadProductora = Boolean(
      automatic.producerUnitId || automatic.producerUnitName,
    );

    const tieneResponsable = Boolean(
      automatic.creationResponsible &&
      String(automatic.creationResponsible).trim(),
    );

    const tieneFechaCreacion = Boolean(
      automatic.createdAt && String(automatic.createdAt).trim(),
    );

    if (!tieneUnidadProductora) faltantesGestion.push('Unidad productora');
    if (!tieneResponsable) faltantesGestion.push('Productor');
    if (!tieneFechaCreacion) faltantesGestion.push('Fecha de creación');

    return {
      cuadroCompleto: faltantesCuadro.length === 0,
      descriptivosCompletos: faltantesDescriptivos.length === 0,
      tecnicosCompletos: totalTecnicos >= 2,
      gestionCompleta: faltantesGestion.length === 0,
      faltantes: {
        cuadro: faltantesCuadro,
        descriptivos: faltantesDescriptivos,
        tecnicos: faltantesTecnicos,
        gestion: faltantesGestion,
      },
      advertencias: {
        descriptivos: advertenciasDescriptivos,
      },
    };
  }

  estadoTexto(ok: boolean): string {
    return ok ? 'Completo' : 'Pendiente';
  }

  estadoClase(ok: boolean): string {
    return ok ? 'pill ok' : 'pill warn';
  }

  formatearFecha(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('es-CR');
  }

  activeTab: EstadoClasificacionTab = 'cuadro';

  seleccionarTab(tab: EstadoClasificacionTab): void {
    this.activeTab = tab;
  }

  getDetalleActivo() {
    const d = this.documento as any;

    const detalles = {
      cuadro: [
        { label: 'Serie', value: d.serie || '—' },
        { label: 'Subserie', value: d.subserie || 'No aplica' },
        { label: 'Expediente', value: d.expediente || '—' },
        {
          label: 'Código de clasificación',
          value: this.buildCodigoClasificacionDetalle(),
        },
        {
          label: 'Ruta seleccionada',
          value: this.buildRutaClasificacionDetalle(),
        },
      ],
      descriptivos: [
        { label: 'Título', value: d.titulo || '—' },
        { label: 'Tipo documental', value: d.tipoDocumental || '—' },
        { label: 'Descripción breve', value: d.descripcion || '—' },
        {
          label: 'Palabras clave',
          value: Array.isArray(d.palabrasClave) && d.palabrasClave.length
            ? d.palabrasClave.join(', ')
            : '—',
        },
        { label: 'Nivel de acceso', value: d.nivelAcceso || '—' },
      ],
      tecnicos: [
        { label: 'Código / identificador', value: d.codigo || '—' },
        { label: 'Tamaño', value: d.tamanoArchivo || 'No disponible' },
        { label: 'Formato', value: d.formato || 'No disponible' },
        {
          label: 'Aplicación de software',
          value: d.softwareAplicacion || 'No disponible',
        },
      ],
      gestion: [
        { label: 'Productor', value: d.autorProductor || '—' },
        { label: 'Unidad productora', value: d.unidadProductora || '—' },
        {
          label: 'Fecha de creación',
          value: this.formatearFecha(d.fechaCreacion),
        },
        {
          label: 'Fecha de recepción',
          value: this.formatearFecha(d.fechaRecepcion),
        },
        { label: 'Estado actual', value: d.estadoActual || '—' },
      ],
    };

    return detalles[this.activeTab];
  }

  private buildCodigoClasificacionDetalle(): string {
    const serie = this.documento?.serie || '';
    const subserie = this.documento?.subserie || '';
    const expediente = this.documento?.expediente || '';

    return [serie, subserie !== 'No aplica' ? subserie : '', expediente]
      .filter(Boolean)
      .join(' / ') || 'Sin clasificación';
  }

  private buildRutaClasificacionDetalle(): string {
    const serie = this.documento?.serie || '';
    const subserie = this.documento?.subserie || '';
    const expediente = this.documento?.expediente || '';

    return [serie, subserie !== 'No aplica' ? subserie : '', expediente]
      .filter(Boolean)
      .join(' > ') || 'Sin ruta seleccionada';
  }

  private formatearTamano(bytes: any): string {
    const n = Number(bytes);

    if (!Number.isFinite(n) || n <= 0) return 'No disponible';

    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;

    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }
}
