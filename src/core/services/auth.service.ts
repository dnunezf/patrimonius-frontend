import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';

type User = { id: number; email: string; rolId?: number; unidadId?: number };
type LoginResp = { token: string; user: User };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.apiUrl;
  token = signal<string | null>(localStorage.getItem('token'));
  currentUser = signal<User | null>(JSON.parse(localStorage.getItem('user') || 'null'));

  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    return this.http.post<LoginResp>(`${this.api}/auth/login`, { email, password })
      .pipe(
        tap(resp => {
          this.setSession(resp);
        })
      );
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
