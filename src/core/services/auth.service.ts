import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';

type User = { id: number; email: string; rolId?: number; unidadId?: number };
type LoginResp = { token: string; user: User };
type LoginStep1Resp = { userId: number; message: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.apiUrl;
  token = signal<string | null>(localStorage.getItem('token'));
  currentUser = signal<User | null>(this.getStoredUser());

  constructor(private http: HttpClient) {}

  private getStoredUser(): User | null {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /** Paso 1: validar credenciales y enviar código 2FA */
  login(email: string, password: string) {
    return this.http.post<LoginStep1Resp>(`${this.api}/auth/login`, { email, password });
  }

  /** Paso 2: verificar código 2FA */
  verify2fa(userId: number, code: string) {
    return this.http.post<LoginResp>(`${this.api}/auth/verify-2fa`, { userId, code })
      .pipe(tap(resp => this.setSession(resp)));
  }

  /** Nuevo: Reenviar código 2FA */
  resend2fa(userId: number) {
    return this.http.post<{ message: string }>(`${this.api}/auth/resend-2fa`, { userId });
  }

  setSession(resp: LoginResp) {
    localStorage.setItem('token', resp.token);
    localStorage.setItem('user', JSON.stringify(resp.user));
    this.token.set(resp.token);
    this.currentUser.set(resp.user);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.token.set(null);
    this.currentUser.set(null);
  }

  activateAccount(token: string, newPassword: string) {
    return this.http.post<{ message: string }>(`${this.api}/auth/activate`, {
      token,
      newPassword,
    });
  }
}
