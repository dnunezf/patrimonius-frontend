/*To be used as a shell for admin features*/

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopbarComponent } from '../../core/layout/topbar/topbar.component';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, TopbarComponent],
  template: `
    <!-- Admin-only chrome -->
    <app-topbar></app-topbar>
    <router-outlet></router-outlet>
  `,
})
export class AdminShellComponent {}
