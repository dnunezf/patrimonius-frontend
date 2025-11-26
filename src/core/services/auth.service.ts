import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';

type User = {
  id: number;
  email: string;
  rolId?: number;
  unidadId?: number;
  rolIds?: number[];
  roles?: string[];
  isMaster?: boolean;
};
type LoginResp = { token: string; user: User; masterLogin?: boolean };
type LoginStep1Resp = { userId: number; message: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.apiUrl;

  // Se inicializan en null y luego se restauran en el constructor
  token = signal<string | null>(null);
  currentUser = signal<User | null>(null);

  constructor(private http: HttpClient) {
    this.restoreSessionFromStorage();
  }

  /** Decodifica el JWT y verifica si está vencido. */
  private isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return true; // token mal formado => lo consideramos inválido
      }

      const payloadBase64 = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/'); // por si viene en formato base64url

      const payloadJson = atob(payloadBase64);
      const payload = JSON.parse(payloadJson);

      if (!payload.exp) {
        return true; // si no trae exp, mejor tratarlo como vencido
      }

      const nowInSeconds = Math.floor(Date.now() / 1000);
      return payload.exp < nowInSeconds;
    } catch {
      // Si algo sale mal decodificando, mejor forzar logout
      return true;
    }
  }

  /** Intenta restaurar la sesión desde localStorage, pero solo si el token sigue vigente. */
  private restoreSessionFromStorage(): void {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser && !this.isTokenExpired(storedToken)) {
      try {
        const user: User = JSON.parse(storedUser);
        this.token.set(storedToken);
        this.currentUser.set(user);
      } catch {
        this.logout();
      }
    } else {
      this.logout();
    }
  }

  /** Método que usará el guard para saber si hay sesión válida. */
  isAuthenticated(): boolean {
    const t = this.token();
    if (!t) {
      return false;
    }
    if (this.isTokenExpired(t)) {
      this.logout();
      return false;
    }
    return true;
  }

  /** Step 1: credentials. Supports either master-direct or 2FA step1 */
  login(email: string, password: string) {
    return this.http.post<LoginResp | LoginStep1Resp>(
      `${this.api}/auth/login`,
      { email, password }
    );
  }

  /** Step 2: only for non-master logins */
  verify2fa(userId: number, code: string) {
    return this.http
      .post<LoginResp>(`${this.api}/auth/verify-2fa`, { userId, code })
      .pipe(tap((resp) => this.setSession(resp)));
  }

  /** Nuevo: Reenviar código 2FA */
  resend2fa(userId: number) {
    return this.http.post<{ message: string }>(`${this.api}/auth/resend-2fa`, {
      userId,
    });
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
