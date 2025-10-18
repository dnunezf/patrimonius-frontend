// src/app/admin/catalogos/catalogo-unidad/catalogo-unidad.component.ts
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { CatalogosService, Unidad } from '../../../../../core/services/catalogos.service';

@Component({
  selector: 'app-catalogo-unidad',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalogo-unidad.component.html',
  styleUrls: ['./catalogo-unidad.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogoUnidadComponent implements OnInit {
  unidades$!: Observable<Unidad[]>;       // 👈 fuente: store reactivo
  form: Partial<Unidad> = { nombre: '', descripcion: '' };
  editing: Unidad | null = null;
  saving = false;
  errorMessage = '';

  constructor(private api: CatalogosService) {}

  ngOnInit() {
    this.api.loadUnidades();              // carga una vez
    this.unidades$ = this.api.unidades$;  // template se reactualiza solo
  }

  submit() {
    if (!this.form.nombre?.trim()) return;
    this.saving = true;

    if (this.editing) {
      this.api.updateUnidad(this.editing.id, this.form).subscribe({
        next: () => { this.saving = false; this.cancel(); },   // store ya emitió
        error: () => { this.saving = false; this.errorMessage = 'Error actualizando unidad'; }
      });
    } else {
      this.api.createUnidad(this.form).subscribe({
        next: () => { this.saving = false; this.form = { nombre: '', descripcion: '' }; }, // store ya emitió
        error: () => { this.saving = false; this.errorMessage = 'Error creando unidad'; }
      });
    }
  }

  edit(u: Unidad) {
    this.editing = u;
    this.form = { nombre: u.nombre, descripcion: u.descripcion };
  }

  cancel() {
    this.editing = null;
    this.form = { nombre: '', descripcion: '' };
  }

  remove(u: Unidad) {
    if (!confirm(`¿Eliminar unidad "${u.nombre}"?`)) return;
    this.api.deleteUnidad(u.id).subscribe({
      // nada más: el store ya quitó el ítem y la tabla se repinta
      error: () => this.errorMessage = 'No se pudo eliminar la unidad'
    });
  }

  trackById = (_: number, item: Unidad) => item.id;
}
