import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

/** Attach the bearer token and sign out on 401 (except from the auth endpoints themselves). */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(TokenService).get();
  const auth = inject(AuthService);

  const authed = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !/\/auth\//i.test(req.url)) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};
