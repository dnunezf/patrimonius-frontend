import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private socket?: Socket;

  connect() {
    if (this.socket) return;
    this.socket = io('/', {
      path: environment.wsPath,
      auth: { token: localStorage.getItem('jwt') || '' }
    });
  }

  joinDocumento(documentoId: number) {
    this.socket?.emit('editor:join', { documentoId });
  }

  sendPatch(content: string) {
    this.socket?.emit('content:patch', { content, ts: Date.now() });
  }

  save(documentoId: number, content: string, baseVersionId: number) {
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
