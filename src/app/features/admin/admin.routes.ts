import {CatalogoRolesComponent} from './catalogos/catalogo-roles/catalogo-roles.component';
import {CatalogoUnidadComponent} from './catalogos/catalogo-unidad/catalogo-unidad.component';
import {CatalogoPlantillasComponent} from './catalogos/catalogo-plantillas/catalogo-plantillas.component';
import {Routes} from '@angular/router';
import {AdminDashboardComponent} from './dashboard/admin-dashboard.component';
import {AdminNotificationsComponent} from './notifications/admin-notifications.component';
import {AdminShellComponent} from './admin-shell.component';
import {PermisosEditorComponent} from './permisosEditor/permisos-editor.component';
import {CatalogosModulePageComponent} from './moduleCatalogos/catalogos-module-page.component';

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

      // Rutas para los catálogos
      {
        path: 'module/catalogs',
        component: CatalogosModulePageComponent, // Asegúrate de que este componente esté correctamente importado
        children: [
          { path: 'roles', component: CatalogoRolesComponent },
          { path: 'unidades', component: CatalogoUnidadComponent },
          { path: 'plantillas', component: CatalogoPlantillasComponent },
        ],
      },

      // Ruta para Permisos del Editor
      { path: 'permisos-editor', component: PermisosEditorComponent }
    ],
  },
];
