import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

type UploadMode = 'FILES' | 'CSV' | 'FOLDER';

@Component({
  selector: 'app-carga-masiva',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carga-masiva.component.html',
  styleUrls: ['./carga-masiva.component.css'],
})
export class CargaMasivaPageComponent {

  currentStep: number = 1;
  mode: UploadMode = 'FILES';

  constructor(private router: Router) {}

  setMode(m: UploadMode): void {
    this.mode = m;
  }

  onClose(): void {
    this.router.navigate(['/dashboard']); // o '/' si preferís
  }

  onCancel(): void {
    this.onClose();
  }

  onNext(): void {
    this.currentStep = Math.min(4, this.currentStep + 1);
  }
}
