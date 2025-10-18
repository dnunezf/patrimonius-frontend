import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { CatalogosService, Plantilla } from '../../../../../core/services/catalogos.service';
import {RouterLink} from '@angular/router';

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

  constructor(private api: CatalogosService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.errorMessage = '';
    this.api.getPlantillas().subscribe({
      next: (rows) => {
        this.plantillas = Array.isArray(rows) ? rows : [];
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Error cargando plantillas';
        this.loading = false;
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
      .uploadPlantilla({ nombre: this.form.nombre, version: this.form.version, descripcion: this.form.descripcion || undefined, file: this.file })
      .subscribe({
        next: () => {
          this.uploading = false;
          // limpiar formulario + input file
          this.form = { nombre: '', version: '1.0', descripcion: '' };
          this.file = undefined;
          if (this.fileInput) this.fileInput.nativeElement.value = '';
          if (this.formRef) this.formRef.resetForm({ nombre: '', version: '1.0', descripcion: '' });
          // recargar desde el backend (consistencia)
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

  href(p: Plantilla) {
    return encodeURI(p.ruta_archivo); // maneja espacios/acentos
  }
}
