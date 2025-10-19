import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  AccessControlService,
  Document,
  AccessControlResponse,
} from '../../../../core/services/access-control.service';

@Component({
  selector: 'app-access-control',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './access-control.component.html',
  styleUrls: ['./access-control.component.css'],
})
export class AccessControlComponent implements OnInit {
  user: any = null;
  documents: Document[] = [];
  loading = true;
  error: string | null = null;

  constructor(private accessService: AccessControlService) {}

  ngOnInit() {
    this.loadAccessControl();
  }

  /** 🔹 Carga inicial de los permisos y documentos */
  private loadAccessControl() {
    this.accessService.getAccessControl().subscribe({
      next: (res: AccessControlResponse) => {
        this.user = res.user;
        this.documents = res.documents;
        this.loading = false;
      },
      error: (err) => {
        console.error('✘ Error cargando permisos:', err);
        this.error = 'Error cargando permisos de acceso';
        this.loading = false;
      },
    });
  }

  /** 🔹 Conteo de documentos con acceso */
  get accessibleCount(): number {
    return this.documents.filter(
      (d) => d.canView || d.canEdit || d.canSign
    ).length;
  }

  /** 🔹 Devuelve la URL del ícono de permiso */
  getIconPath(allowed: boolean): string {
    return allowed ? 'assets/icons/check.png' : 'assets/icons/equis.png';
  }
}
