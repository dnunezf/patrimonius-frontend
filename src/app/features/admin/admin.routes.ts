import { Routes } from '@angular/router';
import { AdminShellComponent } from './admin-shell.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { AdminNotificationsComponent } from './notifications/admin-notifications.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'notifications', component: AdminNotificationsComponent },
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
