import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogosService, Unidad } from '../catalogos.service';

@Component({
  selector: 'app-catalogo-unidad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalogo-unidad.component.html',
  styleUrls: ['./catalogo-unidad.component.css'],
})
export class CatalogoUnidadComponent implements OnInit {
  unidades: Unidad[] = [];
  form: Partial<Unidad> = { nombre: '', descripcion: '' };
  editing: Unidad | null = null;
  loading = false;

  constructor(private api: CatalogosService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getUnidades().subscribe({
      next: (d) => { this.unidades = d; this.loading = false; },
      error: () => { this.loading = false; alert('Error cargando unidades'); },
    });
  }

  submit() {
    if (!this.form.nombre?.trim()) return;
    if (this.editing) {
      this.api.updateUnidad(this.editing.id, this.form).subscribe({
        next: (u) => { Object.assign(this.editing!, u); this.cancel(); },
        error: () => alert('Error actualizando unidad'),
      });
    } else {
      this.api.createUnidad(this.form).subscribe({
        next: (u) => { this.unidades.push(u); this.form = { nombre: '', descripcion: '' }; },
        error: () => alert('Error creando unidad'),
      });
    }
  }

  edit(u: Unidad) { this.editing = u; this.form = { nombre: u.nombre, descripcion: u.descripcion }; }
  cancel() { this.editing = null; this.form = { nombre: '', descripcion: '' }; }

  remove(id: number) {
    if (!confirm('¿Eliminar unidad?')) return;
    this.api.deleteUnidad(id).subscribe({
      next: () => this.unidades = this.unidades.filter(x => x.id !== id),
      error: () => alert('No se pudo eliminar (quizá está referenciada)'),
    });
  }
}
