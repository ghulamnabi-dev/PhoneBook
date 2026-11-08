import { TestBed } from '@angular/core/testing';
import { TokenService } from './token.service';

const KEY = 'phonebook.token';

function b64url(obj: unknown): string {
  return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function jwt(payload: unknown): string {
  return `h.${b64url(payload)}.s`;
}

describe('TokenService', () => {
  let service: TokenService;

  beforeEach(() => {
    localStorage.removeItem(KEY);
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenService);
  });
  afterEach(() => {
    try {
      localStorage.removeItem(KEY); // may be a throwing spy in the "storage throws" block
    } catch {
      /* ignore */
    }
  });

  it('returns null when no token is stored', () => {
    expect(service.get()).toBeNull();
  });

  it('returns the token that was set', () => {
    service.set('abc');
    expect(service.get()).toBe('abc');
  });

  it('forgets the token after clear', () => {
    service.set('abc');
    service.clear();
    expect(service.get()).toBeNull();
  });

  describe('payload', () => {
    it('is null when there is no token', () => {
      expect(service.payload()).toBeNull();
    });

    it('decodes a base64url JWT payload', () => {
      // "~~~???" style characters force "-" / "_" in base64url output.
      const claims = { name: 'a@b.c', note: '???>>>~~~', exp: 123 };
      service.set(jwt(claims));
      expect(service.payload()).toEqual(claims);
    });

    it('is null for a token without three parts', () => {
      service.set('not-a-jwt');
      expect(service.payload()).toBeNull();
    });

    it('is null when the payload is not valid JSON', () => {
      service.set(`h.${btoa('nope')}.s`);
      expect(service.payload()).toBeNull();
    });
  });

  describe('isExpired', () => {
    it('is true when exp is in the past', () => {
      service.set(jwt({ exp: Math.floor(Date.now() / 1000) - 60 }));
      expect(service.isExpired()).toBeTrue();
    });

    it('is false when exp is in the future', () => {
      service.set(jwt({ exp: Math.floor(Date.now() / 1000) + 3600 }));
      expect(service.isExpired()).toBeFalse();
    });

    it('is false when the token has no exp claim', () => {
      service.set(jwt({ name: 'x' }));
      expect(service.isExpired()).toBeFalse();
    });

    it('is false for a malformed token', () => {
      service.set('garbage');
      expect(service.isExpired()).toBeFalse();
    });
  });

  describe('when localStorage throws', () => {
    beforeEach(() => {
      spyOn(Storage.prototype, 'getItem').and.throwError('denied');
      spyOn(Storage.prototype, 'setItem').and.throwError('denied');
      spyOn(Storage.prototype, 'removeItem').and.throwError('denied');
    });

    it('get returns null', () => expect(service.get()).toBeNull());
    it('set does not throw', () => expect(() => service.set('x')).not.toThrow());
    it('clear does not throw', () => expect(() => service.clear()).not.toThrow());
    it('payload is null', () => expect(service.payload()).toBeNull());
  });
});
