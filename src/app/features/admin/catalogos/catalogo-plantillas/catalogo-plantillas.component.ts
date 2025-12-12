import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { CatalogosService, Plantilla } from '../../../../../core/services/catalogos.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-catalogo-plantillas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalogo-plantillas.component.html',
  styleUrls: ['./catalogo-plantillas.component.css'],
})
export class CatalogoPlantillasComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('f') formRef!: NgForm;

  plantillas: Plantilla[] = [];
  form = { nombre: '', version: '1.0', descripcion: '' };
  file?: File;
  loading = false;
  uploading = false;
  errorMessage = '';

  // ✅ Paginación frontend (page size = 10)
  page = 1;
  readonly pageSize = 10;

  // ✅ Para usar Math en el HTML
  Math = Math;

  constructor(private api: CatalogosService) {}

  ngOnInit() {
    this.load();
  }

  /** Total de items */
  get totalItems(): number {
    return Array.isArray(this.plantillas) ? this.plantillas.length : 0;
  }

  /** Total de páginas (mínimo 1) */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  /** Lista paginada */
  get pagedPlantillas(): Plantilla[] {
    const start = (this.page - 1) * this.pageSize;
    return (this.plantillas ?? []).slice(start, start + this.pageSize);
  }

  /** Ajusta page para que nunca quede fuera del rango */
  private clampPage() {
    if (!Number.isFinite(this.page) || this.page < 1) this.page = 1;
    const tp = this.totalPages; // ya incluye mínimo 1
    if (this.page > tp) this.page = tp;
  }

  /** Reglas extra: si estás en página vacía (por borrar), retrocede */
  private ensureNonEmptyPageAfterChange() {
    this.clampPage();

    // si estás en una página que quedó sin items y hay items en total, retrocede una
    const start = (this.page - 1) * this.pageSize;
    if (this.totalItems > 0 && start >= this.totalItems && this.page > 1) {
      this.page--;
    }

    this.clampPage();
  }

  load() {
    this.loading = true;
    this.errorMessage = '';

    this.api.getPlantillas().subscribe({
      next: (rows) => {
        this.plantillas = Array.isArray(rows) ? rows : [];
        this.loading = false;

        // ✅ si cambió el tamaño, ajustamos page
        this.ensureNonEmptyPageAfterChange();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Error cargando plantillas';
        this.loading = false;

        // si falla, igual mantenemos paginación coherente
        this.ensureNonEmptyPageAfterChange();
      },
    });
  }

  onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    this.file = input.files?.[0] ?? undefined;
  }

  upload() {
    if (!this.form.nombre || !this.form.version || !this.file) {
      alert('Nombre, versión y archivo son obligatorios');
      return;
    }

    this.uploading = true;

    this.api
      .uploadPlantilla({
        nombre: this.form.nombre,
        version: this.form.version,
        descripcion: this.form.descripcion || undefined,
        file: this.file,
      })
      .subscribe({
        next: () => {
          this.uploading = false;

          // limpiar formulario + input file
          this.form = { nombre: '', version: '1.0', descripcion: '' };
          this.file = undefined;

          if (this.fileInput) this.fileInput.nativeElement.value = '';
          if (this.formRef) this.formRef.resetForm({ nombre: '', version: '1.0', descripcion: '' });

          // ✅ después de crear, volvemos a cargar y nos aseguramos de quedar en una página válida
          // Si preferís ir a la última página automáticamente:
          // this.page = this.totalPages;  <-- eso funcionaría solo si ya tuvieras la lista actualizada localmente
          this.load();
        },
        error: (err) => {
          console.error(err);
          this.uploading = false;
          alert('Error subiendo plantilla');
        },
      });
  }

  rename(p: Plantilla) {
    const nuevo = prompt('Nuevo nombre', p.nombre);
    if (!nuevo || nuevo === p.nombre) return;

    this.api.updatePlantilla(p.id, { nombre: nuevo }).subscribe({
      next: () => this.load(),
      error: () => alert('Error renombrando plantilla'),
    });
  }

  remove(id: number) {
    if (!confirm('¿Eliminar plantilla?')) return;

    this.api.deletePlantilla(id).subscribe({
      next: () => this.load(),
      error: () => alert('No se pudo eliminar plantilla'),
    });
  }

  /** Para abrir el archivo */
  href(p: Plantilla) {
    return encodeURI(p.ruta_archivo);
  }

  // ✅ helpers para botones de paginación (si los querés usar en HTML)
  prevPage() {
    this.page = Math.max(1, this.page - 1);
  }

  nextPage() {
    this.page = Math.min(this.totalPages, this.page + 1);
  }

  goToPage(n: number) {
    this.page = n;
    this.clampPage();
  }
}
