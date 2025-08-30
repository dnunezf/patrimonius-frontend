import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
// Corrige la ruta de importación de NavComponent
import { NavComponent } from '../app/core/nav/nav.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, NavComponent,], //LoginDialogComponent
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  open = signal(false);

  items = [
    { label: 'Inicio', path: '/', exact: true },
  ];

  onLoginSubmit(ev:{email:string;password:string}) {
    console.log('login', ev);
    this.open.set(false);
  }
}
