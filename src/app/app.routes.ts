import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from '../home/home.component';
import { AccessExceptionsComponent } from './features/admin/access-exceptions/access-exceptions.component';

import { ConsultasBitacorasComponent } from './features/bitacoras/consultas-bitacoras/consultas-bitacoras.component';  // Adjust the import path
import { AccessExceptionsComponent } from './features/admin/access-exceptions/access-exceptions.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },
  {
    path: 'logs',
    loadChildren: () =>
      import('./features/logs/logs.routes').then(m => m.LOGS_ROUTES),
  },
  { path: 'access-exceptions', component: AccessExceptionsComponent },
  {
    path: 'logs',
    loadChildren: () =>
      import('./features/logs/logs.routes').then(m => m.LOGS_ROUTES),
  },
  { path: 'bitacoras', component: ConsultasBitacorasComponent },
  { path: 'access-exceptions', component: AccessExceptionsComponent },
  { path: '**', redirectTo: '' }
];
