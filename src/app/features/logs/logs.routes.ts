import { Routes } from '@angular/router';
import { AuthGuard } from '../../../core/services/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';
import { LogQueriesComponent } from './log-queries/log-queries.component';
import { DocumentCycleLogComponent } from './document-cycle-log/document-cycle-log.component';
import { SecurityLogComponent } from './security-log/security-log.component';
import { UserActivityLogComponent } from './user-activity-log/user-activity-log.component';
import { ActividadUsuarioLogComponent } from './actividad-usuario-log/actividad-usuario-log.component';
import { ExpedienteBitacoraLogComponent } from './expediente-bitacora-log/expediente-bitacora-log.component';

export const LOGS_ROUTES: Routes = [
  {
    path: '',
    children: [
      { path: 'queries', component: LogQueriesComponent, title: 'Patrimonius | Consultas de Bitácora' },
      { path: 'document-cycle', component: DocumentCycleLogComponent, title: 'Patrimonius | Bitácora de Ciclo Documental' },
      {
        path: 'security',
        component: SecurityLogComponent,
        title: 'Patrimonius | Bitácora de Seguridad',
        canActivate: [AuthGuard, RoleGuard],
        data: { allowedRoles: [1] },
      },
      {
        path: 'user-activity',
        component: UserActivityLogComponent,
        title: 'Patrimonius | Bitácora de Permisos y Accesos',
      },
      {
        path: 'actividad-usuario',
        component: ActividadUsuarioLogComponent,
        title: 'Patrimonius | Bitácora de Actividad de Usuario',
      },
      {
        path: 'expediente-bitacora',
        component: ExpedienteBitacoraLogComponent,
        title: 'Patrimonius | Bitácora de Expedientes',
      },
      { path: '', pathMatch: 'full', redirectTo: 'queries' }
    ]
  }
];
