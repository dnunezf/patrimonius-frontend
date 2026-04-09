// admin.routes.ts
import { Routes } from '@angular/router';
import { AdminShellComponent } from './admin-shell.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { NotificationsComponent } from '../notifications/notifications.component';
import { AccessExceptionsComponent } from './access-exceptions/access-exceptions.component';
import { CatalogoRolesComponent } from './catalogos/catalogo-roles/catalogo-roles.component';
import { CatalogoUnidadComponent } from './catalogos/catalogo-unidad/catalogo-unidad.component';
import { CatalogoPlantillasComponent } from './catalogos/catalogo-plantillas/catalogo-plantillas.component';
import { CatalogoSerieComponent } from './catalogos/catalogo-serie/catalogo-serie.component';
import { CatalogoSubserieComponent } from './catalogos/catalogo-subserie/catalogo-subserie.component';
import { CatalogoExpedienteComponent } from './catalogos/catalogo-expediente/catalogo-expediente.component';
import { PermisosEditorComponent } from './permisosEditor/permisos-editor.component';
import { CatalogosModulePageComponent } from './moduleCatalogos/catalogos-module-page.component';
import { AccessControlComponent } from './access-control/access-control.component';
import {
  AdminSolicitudesDocumentosPageComponent
} from './solicitudesDocumentos/admin-solicitudesDocumentos-page.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'notifications', component: NotificationsComponent },
      { path: 'access-exceptions', component: AccessExceptionsComponent },
      { path: 'access-control', component: AccessControlComponent },

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

      {
        path: 'module/catalogs',
        component: CatalogosModulePageComponent,
      },

      { path: 'module/catalogs/roles', component: CatalogoRolesComponent },
      { path: 'module/catalogs/unidades', component: CatalogoUnidadComponent },
      { path: 'module/catalogs/plantillas', component: CatalogoPlantillasComponent },

      { path: 'module/catalogs/series', component: CatalogoSerieComponent },
      { path: 'module/catalogs/subseries', component: CatalogoSubserieComponent },
      { path: 'module/catalogs/expedientes', component: CatalogoExpedienteComponent },

      { path: 'permisos-editor', component: PermisosEditorComponent },
      {
        path: 'solicitudes-documentos',
        component: AdminSolicitudesDocumentosPageComponent,
      },
    ],
  },
];
