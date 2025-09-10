import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogosService, Rol } from '../../../../../core/services/catalogos.service';

@Component({
  selector: 'app-catalogo-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalogo-roles.component.html',
  styleUrls: ['./catalogo-roles.component.css'],
})
export class CatalogoRolesComponent implements OnInit {
  roles: Rol[] = [];
  form: Partial<Rol> = { nombre: '', descripcion: '' };
  editing: Rol | null = null;
  loading = false;

  constructor(private api: CatalogosService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getRoles().subscribe({
      next: (d) => { this.roles = d; this.loading = false; },
      error: () => { this.loading = false; alert('Error cargando roles'); },
    });
  }

  submit() {
    if (!this.form.nombre?.trim()) return;
    if (this.editing) {
      this.api.updateRol(this.editing.id, this.form).subscribe({
        next: (r) => { Object.assign(this.editing!, r); this.cancel(); },
        error: () => alert('Error actualizando rol'),
      });
    } else {
      this.api.createRol(this.form).subscribe({
        next: (r) => { this.roles.push(r); this.form = { nombre: '', descripcion: '' }; },
        error: () => alert('Error creando rol'),
      });
    }
  }

  edit(r: Rol) { this.editing = r; this.form = { nombre: r.nombre, descripcion: r.descripcion }; }
  cancel() { this.editing = null; this.form = { nombre: '', descripcion: '' }; }

  remove(id: number) {
    if (!confirm('¿Eliminar rol?')) return;
    this.api.deleteRol(id).subscribe({
      next: () => this.roles = this.roles.filter(x => x.id !== id),
      error: () => alert('No se pudo eliminar (quizá está referenciado)'),
    });
  }
}
