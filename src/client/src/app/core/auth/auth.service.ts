import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, UserAccount } from '../models';
import { TokenService } from './token.service';

/** ASP.NET Core may map short claim names to these long URIs. */
const NAME_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name';
const EMAIL_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress';

function claim(payload: Record<string, unknown> | null, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = payload?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokens = inject(TokenService);
  private readonly base = `${environment.apiUrl}/auth`;

  private readonly _token = signal<string | null>(this.tokens.get());

  readonly isAuthenticated = computed(() => !!this._token() && !this.tokens.isExpired());

  /** Decoded JWT payload; re-evaluated whenever the token changes. */
  private readonly payload = computed(() => (this._token() ? this.tokens.payload() : null));

  /** E-mail from the `email` claim. */
  readonly userEmail = computed(() => claim(this.payload(), 'email', EMAIL_CLAIM));

  /** Display name from the `name` claim; falls back to the local part of the e-mail. */
  readonly userName = computed(() => {
    const name = claim(this.payload(), 'name', NAME_CLAIM, 'unique_name');
    if (name) return name.includes('@') ? name.split('@')[0] : name;
    return this.userEmail()?.split('@')[0] ?? 'Account';
  });

  login(body: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login`, body).pipe(tap((r) => this.store(r.token)));
  }

  register(body: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/register`, body).pipe(tap((r) => this.store(r.token)));
  }

  /** The signed-in account as the API sees it. */
  me(): Observable<UserAccount> {
    return this.http.get<UserAccount>(`${this.base}/me`);
  }

  logout(): void {
    this.tokens.clear();
    this._token.set(null);
    void this.router.navigate(['/login']);
  }

  private store(token: string): void {
    this.tokens.set(token);
    this._token.set(token);
  }
}
