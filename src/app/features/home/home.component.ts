import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common'; // 👈 quitamos NgIf
import { AuthService } from '../../../core/services/auth.service';
import { LoginDialogComponent } from '../../auth/login-dialog.component';
import { NavComponent } from '../../../app/core/nav/nav.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, LoginDialogComponent, NavComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  open = signal(false);

  items = [{ label: 'Inicio', path: '/' }];

  constructor(public auth: AuthService) {}

  openLogin() {
    this.open.set(true);
  }

  closeLogin() {
    this.open.set(false);
  }

  logout() {
    this.auth.logout();
  }

  isLoggedIn = computed(() => !!this.auth.token());
}
