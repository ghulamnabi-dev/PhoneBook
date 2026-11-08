import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../core/notification.service';
import { GroupsStore } from './groups.store';

const API = environment.apiUrl;

describe('GroupsStore', () => {
  let store: GroupsStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: NotificationService, useValue: jasmine.createSpyObj('N', ['error']) }],
    });
    store = TestBed.inject(GroupsStore);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads groups sorted by name and the rail totals from two one-row searches', () => {
    store.refresh();
    http.expectOne(`${API}/groups`).flush([{ id: 2, name: 'work', contactCount: 3 }, { id: 1, name: 'Family', contactCount: 2 }]);
    const searches = http.match((r) => r.url === `${API}/contacts`);
    expect(searches.length).toBe(2);
    const fav = searches.find((r) => r.request.params.get('favourites') === 'true')!;
    const all = searches.find((r) => r !== fav)!;
    expect(all.request.params.get('pageSize')).toBe('1');
    all.flush({ items: [], total: 60, page: 1, pageSize: 1, totalPages: 60 });
    fav.flush({ items: [], total: 7, page: 1, pageSize: 1, totalPages: 7 });

    expect(store.groups().map((g) => g.name)).toEqual(['Family', 'work']);
    expect(store.totals()).toEqual({ all: 60, favourites: 7 });
    expect(store.byId(2)?.name).toBe('work');
  });

  it('adds, renames and removes groups locally after the API confirms', () => {
    store.create(' Vendors ').subscribe();
    const post = http.expectOne(`${API}/groups`);
    expect(post.request.body).toEqual({ name: 'Vendors' });
    post.flush({ id: 3, name: 'Vendors', contactCount: 0 });
    expect(store.groups().map((g) => g.name)).toEqual(['Vendors']);

    store.rename(3, 'Suppliers').subscribe();
    http.expectOne(`${API}/groups/3`).flush({ id: 3, name: 'Suppliers', contactCount: 0 });
    expect(store.byId(3)?.name).toBe('Suppliers');

    store.remove(3).subscribe();
    http.expectOne(`${API}/groups/3`).flush(null, { status: 204, statusText: 'No Content' });
    expect(store.groups()).toEqual([]);
  });

  it('never lets the favourites count go negative', () => {
    store.adjustFavourites(-1);
    expect(store.totals().favourites).toBe(0);
  });
});
