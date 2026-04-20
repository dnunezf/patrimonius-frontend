import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import {AuthService} from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('token');

    let authReq = req;
    if (token) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        const isAuthRoute =
          req.url.includes('/auth/login') ||
          req.url.includes('/auth/verify-2fa') ||
          req.url.includes('/auth/refresh') ||
          req.url.includes('/auth/logout') ||
          req.url.includes('/auth/activate') ||
          req.url.includes('/auth/reset-password') ||
          req.url.includes('/auth/request-password-reset') ||
          req.url.includes('/auth/resend-2fa');

        if (error.status !== 401 || isAuthRoute) {
          return throwError(() => error);
        }

        return this.handle401Error(authReq, next);
      })
    );
  }

  private handle401Error(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.auth.refreshSession().pipe(
        switchMap((resp) => {
          this.isRefreshing = false;

          localStorage.setItem('token', resp.token);
          if (resp.refreshToken) {
            localStorage.setItem('refreshToken', resp.refreshToken);
          }
          localStorage.setItem('user', JSON.stringify(resp.user));

          this.auth.token.set(resp.token);
          this.auth.currentUser.set(resp.user);

          this.refreshTokenSubject.next(resp.token);

          const cloned = req.clone({
            setHeaders: {
              Authorization: `Bearer ${resp.token}`,
            },
          });

          return next.handle(cloned);
        }),
        catchError((err) => {
          this.isRefreshing = false;
          this.auth.logout();
          return throwError(() => err);
        })
      );
    }

    return this.refreshTokenSubject.pipe(
      filter((token) => token != null),
      take(1),
      switchMap((token) => {
        const cloned = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        });
        return next.handle(cloned);
      })
    );
  }
}
