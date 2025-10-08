import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavComponent } from './core/nav/nav.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavComponent],
  template: `
    <app-nav
      [brandTitle]="'Patrimonius'"
      [brandSubtitle]="'Museo Nacional de Costa Rica'"
      [logo]="'assets/logos/logo.png'"
      [loginItem]="{ label: 'Iniciar Sesión', path: '/login' }"
      (loginClick)="openLogin()">
    </app-nav>

    <router-outlet></router-outlet>
  `,
})
export class AppComponent {
  constructor(private router: Router) {}


  openLogin() {
    this.router.navigate(['/login']);
  }
}
