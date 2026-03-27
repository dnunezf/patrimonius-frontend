import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

type HubCard = {
  title: string;
  badge: string;
  description: string;
  icon: 'search' | 'eye' | 'doc' | 'clock' | 'box';
  route?: string;
  disabled?: boolean;
};

@Component({
  selector: 'app-usuario-consulta-hub',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './usuario-consulta-hub.component.html',
  styleUrls: ['./usuario-consulta-hub.component.css'],
})
export class UsuarioConsultaHubComponent {
  private readonly router = inject(Router);

  readonly cards: HubCard[] = [
    {
      title: 'Buscar documentos',
      badge: 'Buscar',
      description: 'Localizar documentos disponibles',
      icon: 'search',
      route: '/consulta/aprobados',
    },
    {
      title: 'Mis consultas',
      badge: '—',
      description: 'Historial de documentos consultados',
      icon: 'eye',
      disabled: true,
    },
    {
      title: 'Documentos recientes',
      badge: '—',
      description: 'Últimos documentos consultados',
      icon: 'doc',
      disabled: true,
    },
    {
      title: 'Novedades',
      badge: '—',
      description: 'Documentos recientemente publicados',
      icon: 'clock',
      disabled: true,
    },
    {
      title: 'Favoritos',
      badge: '—',
      description: 'Documentos marcados como importantes',
      icon: 'box',
      disabled: true,
    },
  ];

  go(card: HubCard): void {
    if (card.disabled || !card.route) return;
    this.router.navigate([card.route]);
  }

  volver(): void {
    this.router.navigate(['/dashboard']);
  }
}
