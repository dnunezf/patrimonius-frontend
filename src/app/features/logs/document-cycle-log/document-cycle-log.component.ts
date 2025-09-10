// src/app/features/logs/document-cycle-log/document-cycle-log.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

type DocState = 'Signed Complete' | 'Signed Partial' | 'Archived';
type ActionType = 'Edit attempt' | 'Digital signature' | 'View/Download';
type ResultType = 'Allowed' | 'Denied';

interface AuditEvent {
  datetime: string; // ISO or human for mock
  userName: string;
  userEmail: string;
  userRole: 'Admin' | 'Editor' | 'Archivist' | 'External';
  documentTitle: string;
  documentCode: string;      // internal code
  documentOfficial?: string; // official code
  requestedAction: ActionType;
  documentState: DocState;
  result: ResultType;
  reason: string;            // UI text in Spanish
}

@Component({
  selector: 'app-document-cycle-log',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './document-cycle-log.component.html',
  styleUrls: ['./document-cycle-log.component.css'],
})
export class DocumentCycleLogComponent {

  // ----- Mock filters (UI labels shown in Spanish via helpers) -----
  filters = {
    q: '',
    user: 'All users',
    state: 'All states',
    action: 'All actions',
    result: 'All results',
    document: ''
  };

  users = [
    'All users',
    'carlos.rodriguez@mncr.go.cr',
    'ana.garcia@mncr.go.cr',
    'maria.lopez@mncr.go.cr',
    'luis.mendez@mncr.go.cr',
    'roberto.vega@mncr.go.cr'
  ];
  states: Array<'All states' | DocState>   = ['All states','Signed Complete','Signed Partial','Archived'];
  actions: Array<'All actions' | ActionType> = ['All actions','Edit attempt','Digital signature','View/Download'];
  results: Array<'All results' | ResultType> = ['All results','Allowed','Denied'];

  // ----- Mock data (UI reasons already in Spanish) -----
  events: AuditEvent[] = [
    {
      datetime: '2025-01-25 10:51:32',
      userName: 'Carlos Rodríguez',
      userEmail: 'carlos.rodriguez@mncr.go.cr',
      userRole: 'Editor',
      documentTitle: 'Acta de Junta – Enero',
      documentCode: 'DOC_001_2025',
      documentOfficial: 'OFI_MNCR-DAF-AC-034-2025',
      requestedAction: 'Edit attempt',
      documentState: 'Signed Complete',
      result: 'Denied',
      reason: 'Documento ya firmado — no permite edición'
    },
    {
      datetime: '2025-01-25 09:45:18',
      userName: 'Ana García',
      userEmail: 'ana.garcia@mncr.go.cr',
      userRole: 'Editor',
      documentTitle: 'Protocolo de Seguridad Institucional',
      documentCode: 'DOC_007_2025',
      documentOfficial: 'OFI_MNCR-DAF-AC-034-2025',
      requestedAction: 'Digital signature',
      documentState: 'Signed Complete',
      result: 'Allowed',
      reason: 'Última firma completada — documento terminado'
    },
    {
      datetime: '2025-01-24 16:30:05',
      userName: 'María López',
      userEmail: 'maria.lopez@mncr.go.cr',
      userRole: 'Editor',
      documentTitle: 'Manual de Procedimientos',
      documentCode: 'DOC_025_2024',
      documentOfficial: 'OFI_MNCR-DAF-AC-025-2024',
      requestedAction: 'Edit attempt',
      documentState: 'Archived',
      result: 'Denied',
      reason: 'Documento archivado — solo lectura permitida'
    },
    {
      datetime: '2025-01-24 14:22:11',
      userName: 'Luis Méndez',
      userEmail: 'luis.mendez@mncr.go.cr',
      userRole: 'Editor',
      documentTitle: 'Informe de Conservación',
      documentCode: 'DOC_003_2024',
      requestedAction: 'Digital signature',
      documentState: 'Signed Partial',
      result: 'Allowed',
      reason: 'Firma parcial aplicada — faltan 1–2 firmas'
    },
    {
      datetime: '2025-01-24 11:55:44',
      userName: 'Roberto Vega',
      userEmail: 'roberto.vega@mncr.go.cr',
      userRole: 'Archivist',
      documentTitle: 'Inventario General de Colecciones',
      documentCode: 'DOC_033_2024',
      documentOfficial: 'OFI_MNCR-DAF-AC-033-2024',
      requestedAction: 'View/Download',
      documentState: 'Archived',
      result: 'Allowed',
      reason: 'Acceso autorizado a documento archivado'
    },
  ];

  // ----- UI actions (mock) -----
  applyFilters() { /* UI only */ }
  clearFilters() {
    this.filters = { q:'', user:'All users', state:'All states', action:'All actions', result:'All results', document:'' };
  }

  // ----- Badges helpers -----
  stateClass(state: DocState) {
    switch (state) {
      case 'Signed Complete': return 'badge badge-green';
      case 'Signed Partial':  return 'badge badge-blue';
      case 'Archived':        return 'badge badge-brown';
    }
  }
  resultClass(res: ResultType) {
    return res === 'Allowed' ? 'badge badge-green' : 'badge badge-red';
  }

  // ----- Translation helpers (Spanish UI) -----
  translateState(state: DocState): string {
    switch (state) {
      case 'Signed Complete': return 'Firmado Completo';
      case 'Signed Partial':  return 'Firmado Parcial';
      case 'Archived':        return 'Archivado';
    }
  }
  translateAction(action: ActionType): string {
    switch (action) {
      case 'Edit attempt':      return 'Intento de edición';
      case 'Digital signature': return 'Firma digital aplicada';
      case 'View/Download':     return 'Consulta y descarga';
    }
  }
  translateResult(res: ResultType): string {
    return res === 'Allowed' ? 'Permitida' : 'Denegada';
  }
  translateRole(role: 'Admin' | 'Editor' | 'Archivist' | 'External'): string {
    switch (role) {
      case 'Admin':     return 'Administrador';
      case 'Editor':    return 'Editor';
      case 'Archivist': return 'Archivista';
      case 'External':  return 'Usuario Externo';
    }
  }

  // For filter dropdown labels:
  translateStateFilter(value: 'All states' | DocState): string {
    return value === 'All states' ? 'Todos los estados' : this.translateState(value);
  }
  translateActionFilter(value: 'All actions' | ActionType): string {
    return value === 'All actions' ? 'Todas las acciones' : this.translateAction(value);
  }
  translateResultFilter(value: 'All results' | ResultType): string {
    return value === 'All results' ? 'Todos los resultados' : this.translateResult(value);
  }
}
