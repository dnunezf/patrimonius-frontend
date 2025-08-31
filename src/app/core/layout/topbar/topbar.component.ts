import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NotificationsStore } from '../../../shared/state/notifications.store';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css'],
})
export class TopbarComponent {
  private store = inject(NotificationsStore);
  // Read-only signal for header badge
  noticeCount = computed(() => this.store.count());
}
