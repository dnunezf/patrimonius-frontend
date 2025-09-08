import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

type LoginBody = { email: string; password: string };
type User = { id: number; email: string; rol_id?: number; rolId?: string };
type LoginResp = { token: string; user: User };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.apiUrl;
  token = signal<string | null>(localStorage.getItem('token'));
  currentUser = signal<User | null>(JSON.parse(localStorage.getItem('user') || 'null'));

  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    return this.http.post<LoginResp>(`${this.api}/auth/login`, { email, password } as LoginBody);
  }

  setSession(data: LoginResp) {
    this.token.set(data.token);
    this.currentUser.set(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }

  logout() {
    this.token.set(null);
    this.currentUser.set(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  isAuthenticated() {
    return !!this.token();
  }
}
