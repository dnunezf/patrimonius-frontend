import { Component, OnInit } from '@angular/core';
import { PlantillaService } from 'src/core/services/template.service';
import { DocumentService } from 'src//core/services/document.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-editor-create-document',
  templateUrl: './editor-create-document.component.html',
  styleUrls: ['./editor-create-document.component.css']
})
export class EditorCreateDocumentComponent implements OnInit {
  plantillas: any[] = [];
  selectedPlantilla: string = '';
  documentTitle: string = '';
  isLoading = true;

  constructor(
    private plantillaService: PlantillaService,
    private documentService: DocumentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPlantillas();
  }

  loadPlantillas(): void {
    this.plantillaService.getAll().subscribe({
      next: (data) => {
        this.plantillas = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar plantillas', err);
        this.isLoading = false;
      }
    });
  }

  createDocument(): void {
    if (!this.documentTitle || !this.selectedPlantilla) {
      alert('Por favor ingresa un título y selecciona una plantilla');
      return;
    }

    const newDocument = {
      titulo: this.documentTitle,
      plantillaId: this.selectedPlantilla
    };

    this.documentService.create(newDocument).subscribe({
      next: (createdDocument) => {
        alert('Documento creado con éxito');
        this.router.navigate(['/editor/dashboard']); // Redirige a dashboard después de crear
      },
      error: (err) => {
        console.error('Error al crear el documento', err);
        alert('Hubo un error al crear el documento');
      }
    });
  }
}
