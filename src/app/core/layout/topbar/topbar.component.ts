import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf } from '@angular/common';
import { NotificationsStore } from '../../../shared/state/notifications.store';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgIf], // enable *ngIf
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css'],
})
export class TopbarComponent {
  private readonly store = inject(NotificationsStore);
  readonly noticeCount = computed(() => this.store.count());
  signOut(): void {}
}
