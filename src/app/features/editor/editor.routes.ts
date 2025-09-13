import { Routes } from '@angular/router';
import { EditorDashboardComponent } from './dashboard/editor-dashboard.component'; // Importa tu componente

export const EDITOR_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: 'dashboard',
        component: EditorDashboardComponent,
        title: 'Patrimonius | Dashboard del Editor'
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' }
    ]
  }
];
