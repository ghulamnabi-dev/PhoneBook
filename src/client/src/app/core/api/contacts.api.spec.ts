import { HttpHeaders, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ContactInput } from '../models';
import { ContactsApi } from './contacts.api';

const BASE = `${environment.apiUrl}/contacts`;

describe('ContactsApi', () => {
  let api: ContactsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ContactsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('searches without parameters when the query is empty', () => {
    api.search().subscribe();
    const req = http.expectOne(BASE);
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ items: [], total: 0, page: 1, pageSize: 50, totalPages: 0 });
  });

  it('sends only the parameters that are set, trimming q', () => {
    api.search({ q: '  +92 30 ', groupId: 4, favourites: true, page: 2, pageSize: 50, sort: 'recent' }).subscribe();
    const req = http.expectOne((r) => r.url === BASE);
    const p = req.request.params;
    expect(p.get('q')).toBe('+92 30');
    expect(p.get('groupId')).toBe('4');
    expect(p.get('favourites')).toBe('true');
    expect(p.get('page')).toBe('2');
    expect(p.get('sort')).toBe('recent');
    req.flush({ items: [], total: 0, page: 2, pageSize: 50, totalPages: 0 });
  });

  it('omits page 1 and false favourites', () => {
    api.search({ page: 1, favourites: false, q: '   ' }).subscribe();
    const req = http.expectOne(BASE);
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ items: [], total: 0, page: 1, pageSize: 50, totalPages: 0 });
  });

  it('creates, updates and deletes by id', () => {
    const input: ContactInput = {
      firstName: 'Ali', lastName: null, company: null, email: null, notes: null, isFavourite: false,
      phones: [{ label: 'Mobile', number: '+92 300 1234567' }], groupIds: [],
    };
    api.create(input).subscribe();
    const post = http.expectOne(BASE);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual(input);
    post.flush({});

    api.update(7, input).subscribe();
    expect(http.expectOne(`${BASE}/7`).request.method).toBe('PUT');

    api.delete(7).subscribe();
    expect(http.expectOne({ method: 'DELETE', url: `${BASE}/7` })).toBeTruthy();
  });

  it('puts { isFavourite } to /contacts/{id}/favourite', () => {
    api.setFavourite(3, true).subscribe();
    const req = http.expectOne(`${BASE}/3/favourite`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ isFavourite: true });
    req.flush({});
  });

  it('downloads exports as a blob response so Content-Disposition is readable', () => {
    let name = null as string | null;
    api.exportAll(2).subscribe((res) => (name = res.headers.get('Content-Disposition')));
    const req = http.expectOne((r) => r.url === `${BASE}/export`);
    expect(req.request.params.get('groupId')).toBe('2');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['BEGIN:VCARD']), { headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename=contacts.vcf' }) });
    expect(name).toBe('attachment; filename=contacts.vcf');

    api.exportOne(9).subscribe();
    expect(http.expectOne(`${BASE}/9/vcard`).request.responseType).toBe('blob');
  });

  it('uploads the import as multipart with the field "file"', () => {
    const file = new File(['BEGIN:VCARD\r\nEND:VCARD'], 'phone.vcf', { type: 'text/vcard' });
    api.import(file).subscribe();
    const req = http.expectOne(`${BASE}/import`);
    const body = req.request.body as FormData;
    expect(body instanceof FormData).toBeTrue();
    expect((body.get('file') as File).name).toBe('phone.vcf');
    req.flush({ imported: 1, skipped: 0, errors: [] });
  });
});
