import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { AccessExceptionsComponent } from './features/admin/access-exceptions/access-exceptions.component';
import { ActivateComponent } from './auth/activate.component';
import { AuthGuard } from '../core/services/auth.guard';


export const routes: Routes = [
  { path: '', component: HomeComponent },

  {
    path: 'admin',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: 'logs',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./features/logs/logs.routes').then((m) => m.LOGS_ROUTES),
  },
  {
    path: 'editor',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./features/editor/editor.routes').then((m) => m.EDITOR_ROUTES),
  },

  // ✅ HU-21: Carga masiva de documentos
  {
    path: 'documentos/carga-masiva',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/documents/carga-masiva.component').then(
        (m) => m.CargaMasivaPageComponent,
      ),
  },

  {
    path: 'conservacion/ingreso',
    canActivate: [AuthGuard],
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
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/dashboard/main-dashboard.component').then(
        (m) => m.MainDashboardComponent,
      ),
  },

  {
    path: 'usuario/dashboard',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/consulta/usuario-consulta-hub.component').then(
        (m) => m.UsuarioConsultaHubComponent,
      ),
  },
  {
    path: 'externo/dashboard',
    redirectTo: '/consulta/aprobados-externo',
    pathMatch: 'full',
  },

  {
    path: 'consulta/aprobados',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/consulta/consulta-aprobados-interno.component').then(
        (m) => m.ConsultaAprobadosInternoComponent,
      ),
  },
  {
    path: 'consulta/aprobados-externo',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/consulta/consulta-aprobados-externo.component').then(
        (m) => m.ConsultaAprobadosExternoComponent,
      ),
  },
  {
    path: 'consulta/solicitud-externa',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/consulta/solicitud-consulta-externa.component').then(
        (m) => m.SolicitudConsultaExternaComponent,
      ),
  },

  { path: 'access-exceptions', component: AccessExceptionsComponent, canActivate: [AuthGuard] },
  { path: 'activate', component: ActivateComponent },
  { path: '**', redirectTo: '' },
];
