import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common'; // 👈 quitamos NgIf
import { AuthService } from '../../../core/services/auth.service';
import { LoginDialogComponent } from '../../auth/login-dialog.component';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, LoginDialogComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  open = signal(false);

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
