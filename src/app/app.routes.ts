import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { AccessExceptionsComponent } from './features/admin/access-exceptions/access-exceptions.component';
import { ActivateComponent } from './auth/activate.component';
import { VerifyExternalSignaturePageComponent } from "app/pages/verify-external-signature-page/verify-external-signature-page.component";
import { VerifyExternalSignatureComponent } from "app/features/firma-externa/verify-external-signature/verify-external-signature.component";


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
  {
    path: 'editor',
    loadChildren: () =>
      import('./features/editor/editor.routes').then(m => m.EDITOR_ROUTES),
  },
  {
    path: 'reset-password-request',
    loadComponent: () =>
      import('./auth/reset-password-request.component').then(
        (m) => m.ResetPasswordRequestComponent
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./auth/reset-password.component').then(
        (m) => m.ResetPasswordComponent
      ),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/main-dashboard.component').then(
        (m) => m.MainDashboardComponent
      ),
  },
  { path: 'access-exceptions', component: AccessExceptionsComponent },
  { path: 'activate', component: ActivateComponent },
  {
    path: "archivo/external-signatures/:documentoId/verify",
    component: VerifyExternalSignaturePageComponent,
  },
  {
    path: "archivo/external-signatures/:documentoId/verify",
    component: VerifyExternalSignatureComponent,
  },
  { path: '**', redirectTo: '' },
];
