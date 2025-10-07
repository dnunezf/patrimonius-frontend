
import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavItem } from './nav.types';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.css']
})
export class NavComponent {
  @Input() brandTitle = 'Patrimonius';
  @Input() brandSubtitle = 'Museo Nacional de Costa Rica';
  @Input() logo = 'assets/logos/logo.png';
  private _items: NavItem[] = [];

  @Input() set items(value: NavItem[]) {
    this._items = (value || []).filter(
      it => (it.label ?? '').trim().toLowerCase() !== 'inicio' && it.path !== '/'
    );
  }
  get items(): NavItem[] { return this._items; }

  @Input() loginItem?: NavItem;
  @Output() loginClick = new EventEmitter<void>();

  isOpen = signal(false);
  toggle() { this.isOpen.update(v => !v); }
  close()  { this.isOpen.set(false); }
}
