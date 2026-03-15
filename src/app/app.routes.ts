import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { AccessExceptionsComponent } from './features/admin/access-exceptions/access-exceptions.component';
import { ActivateComponent } from './auth/activate.component';


export const routes: Routes = [
  { path: '', component: HomeComponent },

  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: 'logs',
    loadChildren: () =>
      import('./features/logs/logs.routes').then((m) => m.LOGS_ROUTES),
  },
  {
    path: 'editor',
    loadChildren: () =>
      import('./features/editor/editor.routes').then((m) => m.EDITOR_ROUTES),
  },

  // ✅ HU-21: Carga masiva de documentos
  {
    path: 'documentos/carga-masiva',
    loadComponent: () =>
      import('./features/documents/carga-masiva.component').then(
        (m) => m.CargaMasivaPageComponent,
      ),
  },

  {
    path: 'conservacion/ingreso',
    loadComponent: () =>
      import('./features/conservation/intake/conservation-intake.page.component').then(
        (m) => m.ConservationIntakePageComponent,
      ),
  },

  {
    path: 'reset-password-request',
    loadComponent: () =>
      import('./auth/reset-password-request.component').then(
        (m) => m.ResetPasswordRequestComponent,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./auth/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/main-dashboard.component').then(
        (m) => m.MainDashboardComponent,
      ),
  },

  { path: 'access-exceptions', component: AccessExceptionsComponent },
  { path: 'activate', component: ActivateComponent },
  { path: '**', redirectTo: '' },
];
