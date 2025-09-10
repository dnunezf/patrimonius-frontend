import { Routes } from '@angular/router';
import { HomeComponent } from '../home/home.component';
import { LogQueriesComponent } from './features/logs/log-queries/log-queries.component';  // Adjust the import path

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
  { path: '**', redirectTo: '' }
];
