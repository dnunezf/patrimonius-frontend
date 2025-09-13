/* import { Component, OnInit } from '@angular/core';
import { DocumentService } from '../../../../core/services/document.service';
import { PlantillaService } from '../../../../core/services/template.service';
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
      id: '',
      titulo: this.documentTitle,
      numero_serie: '',
      estado: 'borrador',
      usuario_id: '',
      fecha: new Date().toISOString(),
      plantillaId: this.selectedPlantilla,

      categoria: null,
      fechaModificacion: null,
      keywords: [],
      descripcion: '',
      oficialCodigo: '',
      pages: 0,
      isBeingEdited: false,
      editedBy: '',
      serie: '',
      fileFormat: '',
      hasComments: false,
      pendingSignatures: 0,
      totalSignatures: 0,
      currentSigners: []
    };

    // Llamar al servicio para crear el documento
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

< !-- <div class="p-6 max-w-3xl mx-auto">
  <h2 class="text-2xl font-semibold mb-4">Crear Documento</h2>

  <div *ngIf="isLoading" class="text-center text-muted-foreground">
    Cargando plantillas...
  </div>

  <div *ngIf="!isLoading && plantillas.length === 0" class="text-center text-muted-foreground">
    No hay plantillas disponibles.
  </div>

  <div *ngIf="!isLoading && plantillas.length > 0">
    <form (ngSubmit)="createDocument()">
      <div class="mb-4">
        <label for="documentTitle" class="block text-sm font-medium text-gray-700">Título del Documento</label>
        <input id="documentTitle" [(ngModel)]="documentTitle" name="documentTitle" type="text" required class="mt-2 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>

      <div class="mb-4">
        <label for="plantillaSelect" class="block text-sm font-medium text-gray-700">Seleccionar Plantilla</label>
        <select id="plantillaSelect" [(ngModel)]="selectedPlantilla" name="selectedPlantilla" required class="mt-2 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          <option value="" disabled selected>Selecciona una plantilla...</option>
          <option *ngFor="let plantilla of plantillas" [value]="plantilla.id">{{ plantilla.nombre }}</option>
        </select>
      </div>

      <div class="flex justify-end">
        <button type="submit" class="px-6 py-2 bg-museo-blue text-white rounded-md hover:bg-museo-blue/90 transition-all">Crear Documento</button>
      </div>
    </form>
  </div>
</div>

*/
