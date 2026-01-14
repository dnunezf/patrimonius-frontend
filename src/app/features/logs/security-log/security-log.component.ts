import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuditService, SecurityItem } from '../../../../core/services/audit.service';
import { AdminUsersService } from '../../../../core/services/admin-users.service';

@Component({
  selector: 'app-security-log',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './security-log.component.html',
  styleUrls: ['./security-log.component.css'],
})
export class SecurityLogComponent implements OnInit {
  users: string[] = ['Todos los usuarios'];
  types: string[] = ['Todos los tipos'];
  actions: string[] = ['Todas las acciones'];

  results: string[] = ['Todos los resultados',  'PERMITIDO', 'DENEGADO'];

  filters = {
    q: '',
    user: 'Todos los usuarios',
    tipoEvento: 'Todos los tipos',
    accion: 'Todas las acciones',
    result: 'Todos los resultados',
  };

  loading = false;
  error: string | null = null;

  page = 1;
  pageSize = 25;
  sortBy = 'fecha_hora';
  sortDir: 'asc' | 'desc' = 'desc';

  events: SecurityItem[] = [];
  totalPages = 1;
  totalItems = 0;

  constructor(private audit: AuditService, private adminUsers: AdminUsersService) {}

  ngOnInit() {
    this.loadUsers();
    this.loadTypes();
    this.loadActions();
    this.fetch();
  }

  private buildQuery() {
    const qp: any = {
      page: this.page,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
    };

    if (this.filters.q?.trim()) qp.q = this.filters.q.trim();
    if (this.filters.user !== 'Todos los usuarios') qp.usuario = this.filters.user;

    if (this.filters.tipoEvento !== 'Todos los tipos') qp.tipoEvento = this.filters.tipoEvento;
    if (this.filters.accion !== 'Todas las acciones') qp.accion = this.filters.accion;

    if (this.filters.result !== 'Todos los resultados') qp.resultado = this.filters.result;

    return qp;
  }

  fetch() {
    this.loading = true;
    this.error = null;

    this.audit.listSecurityEvents(this.buildQuery()).subscribe({
      next: (res) => {
        this.events = res.items;
        this.totalItems = res.totalItems;
        this.totalPages = res.totalPages;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Error cargando eventos de seguridad';
        this.loading = false;
      }
    });
  }

  applyFilters() { this.page = 1; this.fetch(); }

  clearFilters() {
    this.filters = {
      q: '',
      user: 'Todos los usuarios',
      tipoEvento: 'Todos los tipos',
      accion: 'Todas las acciones',
      result: 'Todos los resultados',
    };
    this.page = 1;
    this.fetch();
  }

  goPrev() { if (this.page > 1) { this.page--; this.fetch(); } }
  goNext() { if (this.page < this.totalPages) { this.page++; this.fetch(); } }

  private loadUsers() {
    this.adminUsers.listEmails().subscribe({
      next: (emails) => this.users = ['Todos los usuarios', ...emails],
      error: () => this.users = ['Todos los usuarios']
    });
  }

  private loadTypes() {
    this.audit.getSecurityTypes().subscribe({
      next: (items) => this.types = ['Todos los tipos', ...items],
      error: () => this.types = ['Todos los tipos'],
    });
  }

  private loadActions() {
    this.audit.getSecurityActions().subscribe({
      next: (items) => this.actions = ['Todas las acciones', ...items],
      error: () => this.actions = ['Todas las acciones'],
    });
  }

  resultClass(res: string | null | undefined) {
    const v = (res || '').trim().toUpperCase();

    if (v.startsWith('PERMITIDO')) return 'badge badge-green';
    if (v.startsWith('DENEGADO')) return 'badge badge-red';

    return 'badge';
  }
  downloadCSV() {
    const rows = this.events || [];
    const headers = ['fecha_hora','usuario','accion','tipo_evento','resultado','ip'];

    const escape = (val: any) => {
      const s = String(val ?? '');
      const mustQuote = /[",\n]/.test(s);
      const safe = s.replace(/"/g, '""');
      return mustQuote ? `"${safe}"` : safe;
    };

    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => escape((r as any)[h])).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    this.triggerDownload(blob, `bitacora_seguridad_${new Date().toISOString().slice(0,10)}.csv`);
  }

  downloadXML() {
    const rows = this.events || [];

    const escXml = (s: any) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bitacoraSeguridad>
${rows.map(r => `
  <evento>
    <fecha_hora>${escXml((r as any).fecha_hora)}</fecha_hora>
    <usuario>${escXml((r as any).usuario)}</usuario>
    <accion>${escXml((r as any).accion)}</accion>
    <tipo_evento>${escXml((r as any).tipo_evento)}</tipo_evento>
    <resultado>${escXml((r as any).resultado)}</resultado>
    <ip>${escXml((r as any).ip)}</ip>
  </evento>`).join('')}
</bitacoraSeguridad>
`.trim();

    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    this.triggerDownload(blob, `bitacora_seguridad_${new Date().toISOString().slice(0,10)}.xml`);
  }

  private triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

}
