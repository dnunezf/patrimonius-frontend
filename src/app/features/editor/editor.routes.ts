import { Routes } from '@angular/router';
import { EditorDashboardComponent } from './dashboard/editor-dashboard.component'; // Importa tu componente
import { EditorCreateDocumentComponent } from './document/editor-create-document.component'; //componente crear documento

export const EDITOR_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: 'dashboard',
        component: EditorDashboardComponent,
        title: 'Patrimonius | Dashboard del Editor'
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'create', component: EditorCreateDocumentComponent },
      //{ path: 'document/:id', component: /* tu componente visor/detalle */ null as any }
    ]
  }
];
