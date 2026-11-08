import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const KEY = 'phonebook.token';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  get(): string | null {
    if (!this.isBrowser) return null;
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }

  set(token: string): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(KEY, token);
    } catch {
      /* storage unavailable (private mode) — session simply won't persist */
    }
  }

  clear(): void {
    if (!this.isBrowser) return;
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }

  /** Decode the JWT payload without verifying (verification is the API's job). */
  payload(): Record<string, unknown> | null {
    const token = this.get();
    if (!token) return null;
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }

  isExpired(): boolean {
    const exp = this.payload()?.['exp'];
    return typeof exp === 'number' ? Date.now() / 1000 > exp : false;
  }
}
