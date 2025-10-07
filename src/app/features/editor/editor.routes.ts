// src/app/editor/editor.routes.ts
import { Routes } from '@angular/router';
import { EditorDashboardComponent } from './dashboard/editor-dashboard.component';
import { EditorCreateDocumentComponent } from './document/create/editor-create-document.component';
import { DocumentEditorComponent } from './document/document-editor.component';

export const EDITOR_ROUTES: Routes = [
  { path: 'dashboard', component: EditorDashboardComponent, title: 'Patrimonius | Dashboard del Editor' },
  { path: 'document/create', component: EditorCreateDocumentComponent, title: 'Crear documento' },
  { path: 'document/:id/edit', component: DocumentEditorComponent, title: 'Editar documento' },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' }
];
