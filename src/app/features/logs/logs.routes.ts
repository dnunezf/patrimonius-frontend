
import { Routes } from '@angular/router';
import { LogQueriesComponent } from './log-queries/log-queries.component';
import { DocumentCycleLogComponent } from './document-cycle-log/document-cycle-log.component';

export const LOGS_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: 'queries',
        component: LogQueriesComponent,
        title: 'Patrimonius | Consultas de Bitácora'
      },
      {
        path: 'document-cycle',
        component: DocumentCycleLogComponent,
        title: 'Patrimonius | Bitácora de Ciclo Documental'
      },
      { path: '', pathMatch: 'full', redirectTo: 'queries' }
    ]
  }
];
