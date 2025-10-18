// src/app/admin/catalogos/catalogo-roles/catalogo-roles.component.ts
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
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

  constructor(private api: CatalogosService) {}

  ngOnInit() {
    this.api.loadRoles();
    this.roles$ = this.api.roles$;
  }

  submit() {
    if (!this.form.nombreRol?.trim()) return;
    this.saving = true;

    if (this.editing) {
      this.api.updateRol(this.editing.idRol, this.form).subscribe({
        next: () => { this.saving = false; this.cancel(); },
        error: () => { this.saving = false; this.errorMessage = 'Error actualizando rol'; }
      });
    } else {
      this.api.createRol(this.form).subscribe({
        next: () => { this.saving = false; this.form = { nombreRol: '', descripcion: '' }; },
        error: () => { this.saving = false; this.errorMessage = 'Error creando rol'; }
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

  remove(r: Rol) {
    if (!confirm(`¿Eliminar rol "${r.nombreRol}"?`)) return;
    this.api.deleteRol(r.idRol).subscribe({
      error: () => this.errorMessage = 'No se pudo eliminar el rol'
    });
  }

  trackById = (_: number, it: Rol) => it.idRol;
}
