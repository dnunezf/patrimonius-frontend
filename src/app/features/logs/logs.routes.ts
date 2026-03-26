
import { Routes } from '@angular/router';
import { LogQueriesComponent } from './log-queries/log-queries.component';
import { DocumentCycleLogComponent } from './document-cycle-log/document-cycle-log.component';
import { SecurityLogComponent } from './security-log/security-log.component';
import { UserActivityLogComponent } from './user-activity-log/user-activity-log.component';

export const LOGS_ROUTES: Routes = [
  {
    path: '',
    children: [
      { path: 'queries', component: LogQueriesComponent, title: 'Patrimonius | Consultas de Bitácora' },
      { path: 'document-cycle', component: DocumentCycleLogComponent, title: 'Patrimonius | Bitácora de Ciclo Documental' },
      { path: 'security', component: SecurityLogComponent, title: 'Patrimonius | Bitácora de Seguridad' },
      {
        path: 'user-activity',
        component: UserActivityLogComponent,
        title: 'Patrimonius | Bitácora de Actividad de Usuario',
      },
      { path: '', pathMatch: 'full', redirectTo: 'queries' }
    ]
  }
];
