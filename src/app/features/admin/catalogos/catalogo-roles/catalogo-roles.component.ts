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
  roles$: Observable<Rol[]>;
  // ahora el formulario usa nombreRol
  form: Partial<Rol> = { nombreRol: '', descripcion: '' };
  editing: Rol | null = null;
  loading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(private api: CatalogosService) {
    this.roles$ = this.api.getRoles();
  }

  ngOnInit() {}

  submit() {
    if (!this.form.nombreRol?.trim()) return;
    this.loading = true;

    if (this.editing) {
      this.api.updateRol(this.editing.idRol, this.form).subscribe({
        next: (r) => {
          Object.assign(this.editing!, r);
          this.cancel();
          this.successMessage = 'Rol actualizado correctamente';
          this.roles$ = this.api.getRoles();
          this.loading = false;
        },
        error: (error) => {
          this.errorMessage = 'Error actualizando rol: ' + error;
          this.loading = false;
        },
      });
    } else {
      this.api.createRol(this.form).subscribe({
        next: () => {
          this.successMessage = 'Rol creado exitosamente';
          this.roles$ = this.api.getRoles();
          this.form = { nombreRol: '', descripcion: '' };
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
    this.form = { nombreRol: r.nombreRol, descripcion: r.descripcion };
  }

  cancel() {
    this.editing = null;
    this.form = { nombreRol: '', descripcion: '' };
    this.errorMessage = null;
    this.successMessage = null;
  }

  remove(idRol: number) {
    if (!confirm('¿Eliminar rol?')) return;
    this.loading = true;
    this.api.deleteRol(idRol).subscribe({
      next: () => {
        this.successMessage = 'Rol eliminado exitosamente';
        this.roles$ = this.api.getRoles();
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'No se pudo eliminar el rol: ' + error;
        this.loading = false;
      },
    });
  }
}
