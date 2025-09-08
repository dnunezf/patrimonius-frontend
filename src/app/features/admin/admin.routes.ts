import { Routes } from '@angular/router';
import { AdminShellComponent } from './admin-shell.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { AdminNotificationsComponent } from './notifications/admin-notifications.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminShellComponent, // topbar + outlet SOLO en /admin/**
    children: [
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'notifications', component: AdminNotificationsComponent },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
];
