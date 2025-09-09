import { Routes } from '@angular/router';
import { HomeComponent } from '../home/home.component';
import { ConsultasBitacorasComponent } from './features/bitacoras/consultas-bitacoras/consultas-bitacoras.component'; // Ajusta el path de importación

export const routes: Routes = [
  { path: '', component: HomeComponent },  // Home
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },
  {
    path: 'bitacoras',
    component: ConsultasBitacorasComponent,
  },
  { path: '**', redirectTo: '' },  // Ruta de fallback
];
