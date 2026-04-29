import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import {
  CatalogosService,
  Plantilla,
} from '../../../../../core/services/catalogos.service';
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

  form = {
    nombre: '',
    version: '1.0',
    descripcion: '',
  };

  file?: File;
  loading = false;
  uploading = false;
  errorMessage = '';

  searchTerm = '';

  // ===== Modal del sistema =====
  modalOpen = false;
  modalMode: 'rename' | 'confirmDelete' = 'rename';
  modalTitle = '';
  modalMessage = '';
  modalOkText = 'Aceptar';
  modalCancelText = 'Cancelar';

  modalInputLabel = 'Nuevo nombre';
  modalInputValue = '';

  pendingPlantilla?: Plantilla;
  pendingDeleteId?: number;

  // ✅ Paginación frontend
  page = 1;
  readonly pageSize = 10;

  // ✅ Para usar Math en el HTML
  Math = Math;

  constructor(private api: CatalogosService) {}

  ngOnInit(): void {
    this.load();
  }

  // ===== Normalización =====

  private toUpperValue(value: string | null | undefined): string {
    return String(value || '').toUpperCase();
  }

  onNombreInput(): void {
    this.form.nombre = this.toUpperValue(this.form.nombre);
  }

  onDescripcionInput(): void {
    this.form.descripcion = this.toUpperValue(this.form.descripcion);
  }

  onSearchInput(): void {
    this.searchTerm = this.toUpperValue(this.searchTerm);
    this.goToPage(1);
  }

  onModalInputValueInput(): void {
    this.modalInputValue = this.toUpperValue(this.modalInputValue);
  }

  // ===== Búsqueda =====

  get filteredPlantillas(): Plantilla[] {
    const term = this.searchTerm.trim().toUpperCase();

    if (!term) return this.plantillas ?? [];

    return (this.plantillas ?? []).filter((p) => {
      const nombre = String(p.nombre || '').toUpperCase();
      const descripcion = String((p as any).descripcion || '').toUpperCase();
      const version = String(p.version || '').toUpperCase();
      const archivo = String(p.ruta_archivo || '').toUpperCase();

      return (
        nombre.includes(term) ||
        descripcion.includes(term) ||
        version.includes(term) ||
        archivo.includes(term)
      );
    });
  }

  // ===== Paginación =====

  get totalItems(): number {
    return Array.isArray(this.filteredPlantillas)
      ? this.filteredPlantillas.length
      : 0;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pagedPlantillas(): Plantilla[] {
    const start = (this.page - 1) * this.pageSize;
    return (this.filteredPlantillas ?? []).slice(start, start + this.pageSize);
  }

  private clampPage(): void {
    if (!Number.isFinite(this.page) || this.page < 1) this.page = 1;

    const tp = this.totalPages;

    if (this.page > tp) this.page = tp;
  }

  private ensureNonEmptyPageAfterChange(): void {
    this.clampPage();

    const start = (this.page - 1) * this.pageSize;

    if (this.totalItems > 0 && start >= this.totalItems && this.page > 1) {
      this.page--;
    }

    this.clampPage();
  }

  prevPage(): void {
    this.page = Math.max(1, this.page - 1);
  }

  nextPage(): void {
    this.page = Math.min(this.totalPages, this.page + 1);
  }

  goToPage(n: number): void {
    this.page = n;
    this.clampPage();
  }

  // ===== Modal =====

  openRenameModal(p: Plantilla): void {
    this.pendingPlantilla = p;
    this.pendingDeleteId = undefined;

    this.modalMode = 'rename';
    this.modalTitle = 'Renombrar plantilla';
    this.modalMessage = 'Escribe el nuevo nombre para la plantilla:';
    this.modalOkText = 'Guardar';
    this.modalCancelText = 'Cancelar';

    this.modalInputValue = this.toUpperValue(p.nombre ?? '');
    this.modalOpen = true;
  }

  openDeleteModal(id: number): void {
    this.pendingDeleteId = id;
    this.pendingPlantilla = undefined;

    this.modalMode = 'confirmDelete';
    this.modalTitle = 'Eliminar plantilla';
    this.modalMessage = 'Esta acción no se puede deshacer. ¿Deseas continuar?';
    this.modalOkText = 'Eliminar';
    this.modalCancelText = 'Cancelar';

    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.pendingPlantilla = undefined;
    this.pendingDeleteId = undefined;
  }

  confirmModal(): void {
    if (this.modalMode === 'rename' && this.pendingPlantilla) {
      const nuevo = this.toUpperValue(this.modalInputValue).trim();

      if (!nuevo || nuevo === this.pendingPlantilla.nombre) {
        this.closeModal();
        return;
      }

      this.api
        .updatePlantilla(this.pendingPlantilla.id, { nombre: nuevo })
        .subscribe({
          next: () => {
            this.closeModal();
            this.load();
          },
          error: () => {
            this.closeModal();
            this.errorMessage = 'Error renombrando plantilla';
          },
        });

      return;
    }

    if (this.modalMode === 'confirmDelete' && this.pendingDeleteId != null) {
      const id = this.pendingDeleteId;

      this.api.deletePlantilla(id).subscribe({
        next: () => {
          this.closeModal();
          this.load();
        },
        error: () => {
          this.closeModal();
          this.errorMessage = 'No se pudo eliminar plantilla';
        },
      });

      return;
    }

    this.closeModal();
  }

  // ===== Datos =====

  load(): void {
    this.loading = true;
    this.errorMessage = '';

    this.api.getPlantillas().subscribe({
      next: (rows) => {
        this.plantillas = Array.isArray(rows) ? rows : [];
        this.loading = false;
        this.ensureNonEmptyPageAfterChange();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Error cargando plantillas';
        this.loading = false;
        this.ensureNonEmptyPageAfterChange();
      },
    });
  }

  onFile(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.file = input.files?.[0] ?? undefined;
  }

  upload(): void {
    if (!this.form.nombre || !this.form.version || !this.file) {
      this.errorMessage = 'Nombre, versión y archivo son obligatorios';
      return;
    }

    const nombre = this.toUpperValue(this.form.nombre).trim();
    const descripcion = this.toUpperValue(this.form.descripcion).trim();

    this.form = {
      ...this.form,
      nombre,
      descripcion,
    };

    this.uploading = true;
    this.errorMessage = '';

    this.api
      .uploadPlantilla({
        nombre,
        version: this.form.version,
        descripcion: descripcion || undefined,
        file: this.file,
      })
      .subscribe({
        next: () => {
          this.uploading = false;

          this.form = {
            nombre: '',
            version: '1.0',
            descripcion: '',
          };

          this.file = undefined;
          this.searchTerm = '';

          if (this.fileInput) this.fileInput.nativeElement.value = '';

          if (this.formRef) {
            this.formRef.resetForm({
              nombre: '',
              version: '1.0',
              descripcion: '',
            });
          }

          this.load();
        },
        error: (err) => {
          console.error(err);
          this.uploading = false;
          this.errorMessage = 'Error subiendo plantilla';
        },
      });
  }

  rename(p: Plantilla): void {
    this.openRenameModal(p);
  }

  remove(id: number): void {
    this.openDeleteModal(id);
  }

  href(p: Plantilla): string {
    return encodeURI(p.ruta_archivo);
  }

  trackById = (_: number, p: Plantilla) => p.id;
}
