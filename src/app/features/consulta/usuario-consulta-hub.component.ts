import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

type HubCard = {
  title: string;
  badge: string;
  description: string;
  icon: 'search' | 'history' | 'doc' | 'sparkles' | 'star';
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
      badge: 'Historial',
      description: 'Historial, descargas por documento y última descarga',
      icon: 'history',
      route: '/consulta/historial',
    },
    {
      title: 'Documentos recientes',
      badge: 'Top 3',
      description: 'Últimos 3 documentos descargados (fecha y hora)',
      icon: 'doc',
      route: '/consulta/recientes',
    },
    {
      title: 'Novedades',
      badge: 'Semana',
      description: 'Aprobados o archivados ingresados esta semana',
      icon: 'sparkles',
      route: '/consulta/novedades',
    },
    {
      title: 'Favoritos',
      badge: '★',
      description: 'Buscar, marcar con estrella y filtrar sus favoritos',
      icon: 'star',
      route: '/consulta/favoritos',
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
