// src/app/core/services/realtime.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private socket?: Socket;

  connect(): void {
    if (this.socket) return;
    this.socket = io(environment.api, {
      path: environment.wsPath || '/ws',
      transports: ['websocket'],
      auth: { token: localStorage.getItem('token') || '' } // <-- mismo key que el interceptor
    });

    this.socket.on('connect_error', (err) => {
      // opcional: log o UI
      console.error('WS connect_error:', err?.message || err);
    });
  }

  // ========= Wrappers genéricos (para el editor) =========
  emit(event: string, payload?: any): void {
    this.socket?.emit(event, payload);
  }
  on<T = any>(event: string, handler: (data: T) => void): void {
    this.socket?.on(event, handler);
  }
  off(event: string, handler?: (data: any) => void): void {
    if (handler) this.socket?.off(event, handler);
    else this.socket?.off(event);
  }

  // ========= API específica que ya usabas =========
  joinDocumento(documentoId: number): void {
    this.socket?.emit('editor:join', { documentoId });
  }

  sendPatch(content: string): void {
    this.socket?.emit('content:patch', { content, ts: Date.now() });
  }

  save(documentoId: number, content: string, baseVersionId: number): void {
    this.socket?.emit('editor:save', { documentoId, content, baseVersionId });
  }

  onPatch(): Observable<any> {
    return new Observable(obs => {
      this.socket?.on('content:patch', (m) => obs.next(m));
      return () => this.socket?.off('content:patch');
    });
  }

  onPresence(): Observable<any[]> {
    return new Observable(obs => {
      this.socket?.on('presence:update', (u) => obs.next(u));
      return () => this.socket?.off('presence:update');
    });
  }

  onSaved(): Observable<any> {
    return new Observable(obs => {
      this.socket?.on('editor:saved', (m) => obs.next(m));
      return () => this.socket?.off('editor:saved');
    });
  }

  onConflict(): Observable<any> {
    return new Observable(obs => {
      this.socket?.on('editor:conflict', (m) => obs.next(m));
      return () => this.socket?.off('editor:conflict');
    });
  }

  ngOnDestroy(): void {
    this.socket?.disconnect();
    this.socket = undefined;
  }
}
