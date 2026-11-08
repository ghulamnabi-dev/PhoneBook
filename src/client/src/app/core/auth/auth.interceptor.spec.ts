import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';
import { TokenService } from './token.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let tokens: { get: jasmine.Spy };
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    tokens = { get: jasmine.createSpy('get').and.returnValue(null) };
    auth = jasmine.createSpyObj('AuthService', ['logout']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: TokenService, useValue: tokens },
        { provide: AuthService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });
  afterEach(() => ctrl.verify());

  it('adds a bearer Authorization header when a token exists', () => {
    tokens.get.and.returnValue('tok');
    http.get('/api/contacts').subscribe();
    const req = ctrl.expectOne('/api/contacts');
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok');
    req.flush([]);
  });

  it('omits the Authorization header when there is no token', () => {
    http.get('/api/contacts').subscribe();
    const req = ctrl.expectOne('/api/contacts');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });

  it('logs out and rethrows on a 401 from a non-Auth URL', () => {
    let status: number | undefined;
    http.get('/api/contacts').subscribe({ error: (e) => (status = e.status) });
    ctrl.expectOne('/api/contacts').flush('x', { status: 401, statusText: 'Unauthorized' });
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(status).toBe(401);
  });

  it('does not log out on a 401 from the login endpoint', () => {
    let status: number | undefined;
    http.post('/api/auth/login', {}).subscribe({ error: (e) => (status = e.status) });
    ctrl.expectOne('/api/auth/login').flush('x', { status: 401, statusText: 'Unauthorized' });
    expect(auth.logout).not.toHaveBeenCalled();
    expect(status).toBe(401);
  });

  it('does not log out on non-401 errors', () => {
    http.get('/api/contacts').subscribe({ error: () => undefined });
    ctrl.expectOne('/api/contacts').flush('x', { status: 500, statusText: 'Server Error' });
    expect(auth.logout).not.toHaveBeenCalled();
  });
});
