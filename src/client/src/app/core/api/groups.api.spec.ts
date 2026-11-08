import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { GroupsApi } from './groups.api';

const BASE = `${environment.apiUrl}/groups`;

describe('GroupsApi', () => {
  let api: GroupsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(GroupsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lists groups', () => {
    let count = 0;
    api.list().subscribe((g) => (count = g.length));
    http.expectOne(BASE).flush([{ id: 1, name: 'Family', contactCount: 3 }]);
    expect(count).toBe(1);
  });

  it('creates with { name }', () => {
    api.create('Work').subscribe();
    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Work' });
    req.flush({ id: 2, name: 'Work', contactCount: 0 });
  });

  it('renames with PUT /groups/{id}', () => {
    api.rename(2, 'Office').subscribe();
    const req = http.expectOne(`${BASE}/2`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Office' });
    req.flush({ id: 2, name: 'Office', contactCount: 0 });
  });

  it('deletes with DELETE /groups/{id}', () => {
    let done = false;
    api.delete(2).subscribe(() => (done = true));
    http.expectOne({ method: 'DELETE', url: `${BASE}/2` }).flush(null, { status: 204, statusText: 'No Content' });
    expect(done).toBeTrue();
  });
});
