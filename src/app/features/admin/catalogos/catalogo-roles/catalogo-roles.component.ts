// src/app/admin/catalogos/catalogo-roles/catalogo-roles.component.ts
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { CatalogosService, Rol } from '../../../../../core/services/catalogos.service';

@Component({
  selector: 'app-catalogo-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalogo-roles.component.html',
  styleUrls: ['./catalogo-roles.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogoRolesComponent implements OnInit {
  roles$!: Observable<Rol[]>;
  form: Partial<Rol> = { nombreRol: '', descripcion: '' };
  editing: Rol | null = null;
  saving = false;
  errorMessage = '';
  // ✅ Modal eliminar
  showDeleteModal = false;
  deleting: Rol | null = null;
  deletingBusy = false;
  // ✅ Paginación (frontend)
  page = 1;
  pageSize = 10;

  constructor(private api: CatalogosService,private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.api.loadRoles();
    this.roles$ = this.api.roles$;
  }

  // ====== Paginación helpers ======
  totalPages(totalItems: number): number {
    return Math.max(1, Math.ceil((totalItems || 0) / this.pageSize));
  }

  paged<T>(list: T[]): T[] {
    const start = (this.page - 1) * this.pageSize;
    return (list ?? []).slice(start, start + this.pageSize);
  }

  goPrev(totalItems: number) {
    this.page = Math.max(1, this.page - 1);
  }

  goNext(totalItems: number) {
    const tp = this.totalPages(totalItems);
    this.page = Math.min(tp, this.page + 1);
  }

  // Ajusta la página si al borrar queda vacía (ej: estabas en pág 2 y ya no hay items)
  ensureValidPage(totalItems: number) {
    const tp = this.totalPages(totalItems);
    if (this.page > tp) this.page = tp;
    if (this.page < 1) this.page = 1;
  }

  // Opcional: volver a página 1 cuando se crea/edita para que el usuario vea el cambio arriba
  resetPage() {
    this.page = 1;
  }

  // ====== CRUD ======
  submit() {
    if (!this.form.nombreRol?.trim()) return;
    this.saving = true;

    if (this.editing) {
      this.api.updateRol(this.editing.idRol, this.form).subscribe({
        next: () => {
          this.saving = false;
          this.cancel();
          this.resetPage();
        },
        error: () => {
          this.saving = false;
          this.errorMessage = 'Error actualizando rol';
        }
      });
    } else {
      this.api.createRol(this.form).subscribe({
        next: () => {
          this.saving = false;
          this.form = { nombreRol: '', descripcion: '' };
          this.resetPage();
        },
        error: () => {
          this.saving = false;
          this.errorMessage = 'Error creando rol';
        }
      });
    }
  }

  edit(r: Rol) {
    this.editing = r;
    this.form = { nombreRol: r.nombreRol, descripcion: r.descripcion };
  }

  cancel() {
    this.editing = null;
    this.form = { nombreRol: '', descripcion: '' };
  }

  openDelete(r: Rol) {
    this.deleting = r;
    this.showDeleteModal = true;
    this.deletingBusy = false;
    this.errorMessage = '';
    this.cdr.markForCheck();
  }

  closeDelete() {
    this.showDeleteModal = false;
    this.deleting = null;
    this.deletingBusy = false;
    this.cdr.markForCheck();
  }

  confirmDelete() {
    if (!this.deleting) return;

    this.deletingBusy = true;
    this.cdr.markForCheck();

    this.api.deleteRol(this.deleting.idRol).subscribe({
      next: () => {
        this.deletingBusy = false;
        this.closeDelete();
        this.resetPage();
        this.cdr.markForCheck();
      },
      error: () => {
        this.deletingBusy = false;
        this.errorMessage = 'No se pudo eliminar el rol (puede estar asignado a usuarios).';
        this.cdr.markForCheck();
      }
    });
  }


  trackById = (_: number, it: Rol) => it.idRol;
}
