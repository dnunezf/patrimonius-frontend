import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {NavComponent} from './core/nav/nav.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  openLogin() {

  }
}
