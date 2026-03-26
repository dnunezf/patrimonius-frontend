// src/app/features/editor/editor.routes.ts
import { Routes } from '@angular/router';
import { EditorDashboardComponent } from './dashboard/editor-dashboard.component';
import { EditorCreateDocumentComponent } from './document/create/editor-create-document.component';
import { DocumentEditorComponent } from './document/document-editor.component';
import { DocumentSignComponent } from './document/sign/document-sign.component';

export const EDITOR_ROUTES: Routes = [
  {
    path: 'dashboard',
    component: EditorDashboardComponent,
    title: 'Patrimonius | Dashboard del Editor',
  },
  { path: 'document/create', component: EditorCreateDocumentComponent, title: 'Crear documento' },

  // ✅ Editor (también sirve para modo lectura con ?readonly=1)
  { path: 'document/:id/edit', component: DocumentEditorComponent, title: 'Documento' },

  // ✅ Firmar documento
  { path: 'document/:id/sign', component: DocumentSignComponent, title: 'Firmar documento' },

  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
];
