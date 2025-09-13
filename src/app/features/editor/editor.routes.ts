import { Routes } from '@angular/router';
import { EditorDashboardComponent } from './dashboard/editor-dashboard.component';
import { EditorCreateDocumentComponent } from './document/editor-create-document.component';  // Agregar esta importación

export const EDITOR_ROUTES: Routes = [
  { path: 'dashboard', component: EditorDashboardComponent },
  { path: 'crear-documento', component: EditorCreateDocumentComponent },  // Agregar esta ruta
];
