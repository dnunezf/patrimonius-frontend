import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DocumentService } from 'core/services/document.service';

const DEFAULT_TEMPLATE_ID = 1; // plantilla base del sistema

@Component({
  standalone: true,
  selector: 'app-editor-create-document',
  imports: [CommonModule, FormsModule],
  templateUrl: './editor-create-document.component.html',
  styleUrls: ['./editor-create-document.component.css']
})
export class EditorCreateDocumentComponent implements OnInit {
  titulo = '';
  loading = false;
  error = '';
  fecha = new Date();
  usuarioEmail = '';

  constructor(private docs: DocumentService, private router: Router) {}

  ngOnInit(): void {
    // Se obtiene el usuario logueado desde localStorage (ajústalo según tu auth)
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      this.usuarioEmail = user.email || 'usuario@patrimonius.mncr';
    } else {
      this.usuarioEmail = 'usuario@patrimonius.mncr';
    }
  }

  crear(): void {
    this.error = '';
    if (!this.titulo.trim()) {
      this.error = 'Debe ingresar un título para el documento';
      return;
    }

    this.loading = true;

    this.docs.crearDesdePlantilla({
      plantilla_id: DEFAULT_TEMPLATE_ID,
      titulo: this.titulo.trim(),
      confid_level: 'INTERNAL'
    }).subscribe({
      next: (res) => {
        this.loading = false;
        this.router.navigate(['/editor/document', res.documento_id, 'edit']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'No se pudo crear el documento';
      }
    });
  }
}
