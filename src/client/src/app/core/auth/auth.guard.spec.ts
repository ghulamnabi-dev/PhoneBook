import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('route guards', () => {
  const authenticated = signal(false);
  let router: Router;

  const run = (guard: typeof authGuard, url = '/app/contacts/4') =>
    TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );

  beforeEach(() => {
    authenticated.set(false);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { isAuthenticated: authenticated } }],
    });
    router = TestBed.inject(Router);
  });

  describe('authGuard', () => {
    it('allows navigation when authenticated', () => {
      authenticated.set(true);
      expect(run(authGuard)).toBeTrue();
    });

    it('redirects to /login with the requested url as returnUrl when not authenticated', () => {
      const result = run(authGuard, '/app/contacts/4') as UrlTree;
      expect(router.serializeUrl(result)).toBe('/login?returnUrl=%2Fapp%2Fcontacts%2F4');
    });
  });

  describe('guestGuard', () => {
    it('allows navigation when not authenticated', () => {
      expect(run(guestGuard)).toBeTrue();
    });

    it('redirects signed-in users to /app', () => {
      authenticated.set(true);
      const result = run(guestGuard) as UrlTree;
      expect(router.serializeUrl(result)).toBe('/app');
    });
  });
});
