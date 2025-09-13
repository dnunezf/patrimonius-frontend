import { Routes } from '@angular/router';
import { AdminShellComponent } from './admin-shell.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { AdminNotificationsComponent } from './notifications/admin-notifications.component';
import { AccessExceptionsComponent } from './access-exceptions/access-exceptions.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'notifications', component: AdminNotificationsComponent },
      { path: 'access-exceptions', component: AccessExceptionsComponent },

      // HU-002 route
      {
        path: 'confidentiality',
        loadComponent: () =>
          import('./confidentiality/admin-confidentiality-page.component').then(
            (m) => m.AdminConfidentialityPageComponent
          ),
      },

      {
        path: 'users',
        loadComponent: () =>
          import('./users/admin-users-page.component').then(
            (m) => m.AdminUsersPageComponent
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'module',
        loadComponent: () =>
          import('./module/admin-module-page.component').then(
            (m) => m.AdminModulePageComponent
          ),
      },
    ],
  },
];
