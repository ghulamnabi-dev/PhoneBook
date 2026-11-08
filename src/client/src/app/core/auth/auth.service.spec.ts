import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

const KEY = 'phonebook.token';

function jwt(payload: unknown): string {
  return `h.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.s`;
}

describe('AuthService', () => {
  let http: HttpTestingController;
  let tokens: TokenService;
  let router: jasmine.SpyObj<Router>;

  function setup(): AuthService {
    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: router }],
    });
    http = TestBed.inject(HttpTestingController);
    tokens = TestBed.inject(TokenService);
    return TestBed.inject(AuthService);
  }

  beforeEach(() => localStorage.removeItem(KEY));
  afterEach(() => localStorage.removeItem(KEY));

  it('is not authenticated without a token', () => {
    expect(setup().isAuthenticated()).toBeFalse();
  });

  it('posts credentials to /auth/login and stores the token', () => {
    const auth = setup();
    const token = jwt({ name: 'Ayesha Khan', email: 'ayesha@example.com' });
    auth.login({ email: 'ayesha@example.com', password: 'secret123' }).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'ayesha@example.com', password: 'secret123' });
    req.flush({ token, name: 'Ayesha Khan', email: 'ayesha@example.com', expiresAt: '2030-01-01T00:00:00Z' });

    expect(tokens.get()).toBe(token);
    expect(auth.isAuthenticated()).toBeTrue();
    expect(auth.userName()).toBe('Ayesha Khan');
    expect(auth.userEmail()).toBe('ayesha@example.com');
  });

  it('registers with name, email and password', () => {
    const auth = setup();
    auth.register({ name: 'Bilal', email: 'b@example.com', password: 'longenough' }).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/auth/register`);
    expect(req.request.body).toEqual({ name: 'Bilal', email: 'b@example.com', password: 'longenough' });
    req.flush({ token: jwt({ name: 'Bilal' }), name: 'Bilal', email: 'b@example.com', expiresAt: '' });
    expect(auth.isAuthenticated()).toBeTrue();
  });

  it('is not authenticated when the stored token is expired', () => {
    localStorage.setItem(KEY, jwt({ exp: 1 }));
    expect(setup().isAuthenticated()).toBeFalse();
  });

  it('falls back to the e-mail local part when there is no name claim', () => {
    localStorage.setItem(KEY, jwt({ email: 'sana.mir@example.com' }));
    expect(setup().userName()).toBe('sana.mir');
  });

  it('clears the token and navigates to /login on logout', () => {
    localStorage.setItem(KEY, jwt({ name: 'x' }));
    const auth = setup();
    auth.logout();
    expect(tokens.get()).toBeNull();
    expect(auth.isAuthenticated()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
