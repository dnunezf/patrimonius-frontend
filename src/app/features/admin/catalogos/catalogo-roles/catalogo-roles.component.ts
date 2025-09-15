import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogosService, Rol } from '../../../../../core/services/catalogos.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-catalogo-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalogo-roles.component.html',
  styleUrls: ['./catalogo-roles.component.css'],
})
export class CatalogoRolesComponent implements OnInit {
  roles$: Observable<Rol[]>; // Observable en lugar de un array directo
  form: Partial<Rol> = { nombre: '', descripcion: '' };
  editing: Rol | null = null;
  loading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(private api: CatalogosService) {
    this.roles$ = this.api.getRoles(); // Asignamos el Observable directamente
  }

  ngOnInit() {
    // La lista de roles es automáticamente gestionada por el async pipe.
  }

  submit() {
    if (!this.form.nombre?.trim()) return;
    this.loading = true;
    if (this.editing) {
      this.api.updateRol(this.editing.id, this.form).subscribe({
        next: (r) => {
          Object.assign(this.editing!, r);
          this.cancel();
          this.successMessage = 'Rol actualizado correctamente';
          this.roles$ = this.api.getRoles(); // Recargar los roles después de la actualización
          this.loading = false;
        },
        error: (error) => {
          this.errorMessage = 'Error actualizando rol: ' + error;
          this.loading = false;
        },
      });
    } else {
      this.api.createRol(this.form).subscribe({
        next: (r) => {
          this.successMessage = 'Rol creado exitosamente';
          this.roles$ = this.api.getRoles(); // Recargar los roles después de la creación
          this.form = { nombre: '', descripcion: '' };
          this.loading = false;
        },
        error: (error) => {
          this.errorMessage = 'Error creando rol: ' + error;
          this.loading = false;
        },
      });
    }
  }

  edit(r: Rol) {
    this.editing = r;
    this.form = { nombre: r.nombre, descripcion: r.descripcion };
  }

  cancel() {
    this.editing = null;
    this.form = { nombre: '', descripcion: '' };
    this.errorMessage = null;
    this.successMessage = null;
  }

  remove(id: number) {
    if (!confirm('¿Eliminar rol?')) return;
    this.loading = true;
    this.api.deleteRol(id).subscribe({
      next: () => {
        this.successMessage = 'Rol eliminado exitosamente';
        this.roles$ = this.api.getRoles(); // Recargar los roles después de la eliminación
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'No se pudo eliminar el rol: ' + error;
        this.loading = false;
      },
    });
  }
}
