import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { interval, Observable, Subscription, throwError } from 'rxjs';

type User = {
  id: number;
  email: string;
  rolId?: number;
  unidadId?: number;
  rolIds?: number[];
  roles?: string[];
  isMaster?: boolean;
};

type LoginResp = {
  token: string;
  refreshToken?: string;
  user: User;
  masterLogin?: boolean;
};

type LoginStep1Resp = { userId: number; message: string };

type RefreshResp = {
  token: string;
  refreshToken?: string;
  user: User;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly api = environment.apiUrl;

  private readonly publicAnonymousPaths = new Set([
    '/',
    '/activate',
    '/reset-password',
    '/reset-password-request',
  ]);

  token = signal<string | null>(null);
  currentUser = signal<User | null>(null);

  sessionWarningVisible = signal(false);
  sessionSecondsRemaining = signal(0);
  longRunningProcessActive = signal(false);

  private warningTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private expiryIntervalSub: Subscription | null = null;

  /**
   * Tiempo antes del vencimiento en el que se mostrará el aviso.
   * Producción recomendada: 5 * 60
   * Pruebas rápidas: 20 o 30
   */
  private readonly warningBeforeSeconds = 5 * 60;
  constructor(private http: HttpClient) {
    this.restoreSessionFromStorage();
  }

  private clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    this.token.set(null);
    this.currentUser.set(null);

    this.sessionWarningVisible.set(false);
    this.sessionSecondsRemaining.set(0);
    this.longRunningProcessActive.set(false);

    this.clearSessionTimers();
  }

  private clearSessionTimers(): void {
    if (this.warningTimeoutId) {
      clearTimeout(this.warningTimeoutId);
      this.warningTimeoutId = null;
    }

    if (this.expiryIntervalSub) {
      this.expiryIntervalSub.unsubscribe();
      this.expiryIntervalSub = null;
    }
  }

  isPublicAnonymousRoute(url?: string): boolean {
    const candidate =
      (url || this.router.url || window.location.pathname || '/')
        .split('?')[0]
        .split('#')[0]
        .replace(/\/+$/, '') || '/';

    return this.publicAnonymousPaths.has(candidate);
  }

  private decodeJwtPayload(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = atob(payloadBase64);
      return JSON.parse(payloadJson);
    } catch {
      return null;
    }
  }

  private getTokenExp(token: string): number | null {
    const payload = this.decodeJwtPayload(token);
    return typeof payload?.exp === 'number' ? payload.exp : null;
  }

  private getSecondsUntilExpiry(token: string): number {
    const exp = this.getTokenExp(token);
    if (!exp) return 0;

    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, exp - now);
  }

  private startSessionMonitoring(): void {
    this.clearSessionTimers();

    const currentToken = this.token();
    if (!currentToken) {
      this.sessionWarningVisible.set(false);
      this.sessionSecondsRemaining.set(0);
      return;
    }

    const secondsUntilExpiry = this.getSecondsUntilExpiry(currentToken);

    // Si ya venció, no mostramos aviso permanente: cerramos sesión.
    if (secondsUntilExpiry <= 0) {
      this.sessionWarningVisible.set(false);
      this.sessionSecondsRemaining.set(0);
      this.logout();
      return;
    }

    // Si ya estamos dentro del umbral, mostrar el aviso de una vez.
    if (secondsUntilExpiry <= this.warningBeforeSeconds) {
      this.sessionWarningVisible.set(true);
      this.sessionSecondsRemaining.set(secondsUntilExpiry);

      this.expiryIntervalSub = interval(1000).subscribe(() => {
        const activeToken = this.token();
        if (!activeToken) {
          this.sessionWarningVisible.set(false);
          this.sessionSecondsRemaining.set(0);
          this.clearSessionTimers();
          return;
        }

        const remaining = this.getSecondsUntilExpiry(activeToken);
        this.sessionSecondsRemaining.set(remaining);

        if (remaining <= 0) {
          this.sessionWarningVisible.set(false);
          this.sessionSecondsRemaining.set(0);
          this.clearSessionTimers();
          this.logout();
        }
      });

      return;
    }

    // Si todavía falta bastante, esperar hasta entrar al umbral.
    const warningDelayMs = Math.max(
      0,
      (secondsUntilExpiry - this.warningBeforeSeconds) * 1000
    );

    this.sessionWarningVisible.set(false);
    this.sessionSecondsRemaining.set(secondsUntilExpiry);

    this.warningTimeoutId = setTimeout(() => {
      const token = this.token();
      if (!token) return;

      this.sessionWarningVisible.set(true);
      this.sessionSecondsRemaining.set(this.getSecondsUntilExpiry(token));

      this.expiryIntervalSub = interval(1000).subscribe(() => {
        const activeToken = this.token();
        if (!activeToken) {
          this.sessionWarningVisible.set(false);
          this.sessionSecondsRemaining.set(0);
          this.clearSessionTimers();
          return;
        }

        const remaining = this.getSecondsUntilExpiry(activeToken);
        this.sessionSecondsRemaining.set(remaining);

        if (remaining <= 0) {
          this.sessionWarningVisible.set(false);
          this.sessionSecondsRemaining.set(0);
          this.clearSessionTimers();
          this.logout();
        }
      });
    }, warningDelayMs);
  }

  private restoreSessionFromStorage(): void {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser && !this.isTokenExpired(storedToken)) {
      try {
        const user: User = JSON.parse(storedUser);
        this.token.set(storedToken);
        this.currentUser.set(user);
        this.startSessionMonitoring();
      } catch {
        this.clearSession();
        if (!this.isPublicAnonymousRoute()) {
          this.router.navigate(['/']);
        }
      }
    } else {
      this.clearSession();
      if (!this.isPublicAnonymousRoute()) {
        this.router.navigate(['/']);
      }
    }
  }

  isTokenExpired(token: string): boolean {
    return this.getSecondsUntilExpiry(token) <= 0;
  }

  isAuthenticated(): boolean {
    const t = this.token();
    if (!t) return false;

    if (this.isTokenExpired(t)) {
      this.clearSession();
      return false;
    }

    return true;
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  setLongRunningProcess(active: boolean): void {
    this.longRunningProcessActive.set(active);
  }

  login(email: string, password: string) {
    return this.http.post<LoginResp | LoginStep1Resp>(
      `${this.api}/auth/login`,
      { email, password }
    );
  }

  verify2fa(userId: number, code: string) {
    return this.http
      .post<LoginResp>(`${this.api}/auth/verify-2fa`, { userId, code })
      .pipe(tap((resp) => this.setSession(resp)));
  }

  resend2fa(userId: number) {
    return this.http.post<{ message: string }>(`${this.api}/auth/resend-2fa`, {
      userId,
    });
  }

  setSessionSilently(resp: LoginResp): void {
    localStorage.setItem('token', resp.token);

    if (resp.refreshToken) {
      localStorage.setItem('refreshToken', resp.refreshToken);
    }

    localStorage.setItem('user', JSON.stringify(resp.user));
    this.token.set(resp.token);
    this.currentUser.set(resp.user);

    this.sessionWarningVisible.set(false);
    this.sessionSecondsRemaining.set(0);

    this.startSessionMonitoring();
  }

  setSession(resp: LoginResp): void {
    this.setSessionSilently(resp);
    this.router.navigate(['/dashboard']);
  }

  refreshSession(): Observable<RefreshResp> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<RefreshResp>(`${this.api}/auth/refresh`, {
      refreshToken,
    });
  }

  continueSession(): Observable<RefreshResp> {
    return this.refreshSession().pipe(
      tap((resp) => {
        this.setSessionSilently(resp);
      }),
      catchError((err) => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  dismissSessionWarning(): void {
    this.sessionWarningVisible.set(false);
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();

    this.clearSession();

    if (refreshToken) {
      this.http
        .post(`${this.api}/auth/logout`, { refreshToken })
        .subscribe({ error: () => {} });
    }

    this.router.navigate(['/']);
  }

  activateAccount(token: string, newPassword: string) {
    return this.http.post<{ message: string }>(`${this.api}/auth/activate`, {
      token,
      newPassword,
    });
  }

  requestPasswordReset(email: string) {
    return this.http.post<{ message?: string } | null>(
      `${this.api}/auth/request-password-reset`,
      { email }
    );
  }

  resetPassword(token: string, newPassword: string) {
    return this.http.post<{ message: string }>(
      `${this.api}/auth/reset-password`,
      { token, newPassword }
    );
  }
}
