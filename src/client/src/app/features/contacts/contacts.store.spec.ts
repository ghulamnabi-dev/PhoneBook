import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ContactSummary, Paged } from '../../core/models';
import { NotificationService } from '../../core/notification.service';
import { GroupsStore } from '../groups/groups.store';
import { ContactsStore, PAGE_SIZE } from './contacts.store';
import { detail, summary } from './testing';

const BASE = `${environment.apiUrl}/contacts`;
const page = (items: ContactSummary[], total = items.length, p = 1): Paged<ContactSummary> => ({
  items, total, page: p, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE),
});

describe('ContactsStore', () => {
  let store: ContactsStore;
  let http: HttpTestingController;
  let notify: jasmine.SpyObj<NotificationService>;
  let groups: jasmine.SpyObj<GroupsStore>;

  const list = () => http.expectOne((r) => r.method === 'GET' && r.url === BASE);

  beforeEach(() => {
    notify = jasmine.createSpyObj('NotificationService', ['error', 'success']);
    groups = jasmine.createSpyObj('GroupsStore', ['refresh', 'adjustFavourites']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notify },
        { provide: GroupsStore, useValue: groups },
      ],
    });
    store = TestBed.inject(ContactsStore);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function loadAll(items: ContactSummary[], total = items.length): void {
    store.setScope('all');
    list().flush(page(items, total));
  }

  describe('loading', () => {
    it('loads the first page sorted by name for the "all" scope', () => {
      store.setScope('all');
      expect(store.loading()).toBeTrue();
      const req = list();
      expect(req.request.params.get('sort')).toBe('name');
      expect(req.request.params.get('pageSize')).toBe(String(PAGE_SIZE));
      expect(req.request.params.has('favourites')).toBeFalse();
      req.flush(page([summary({ id: 1 })], 1));
      expect(store.loading()).toBeFalse();
      expect(store.items().length).toBe(1);
      expect(store.total()).toBe(1);
    });

    it('filters by favourites or group and builds the matching base URL', () => {
      store.setScope('favourites');
      expect(list().request.params.get('favourites')).toBe('true');
      expect(store.baseUrl()).toEqual(['/app', 'favourites']);

      store.setScope('group', 4);
      expect(list().request.params.get('groupId')).toBe('4');
      expect(store.baseUrl()).toEqual(['/app', 'groups', '4']);
    });

    it('does not reload when the scope is unchanged', () => {
      loadAll([]);
      store.setScope('all');
      http.expectNone(BASE);
      expect(store.loading()).toBeFalse();
    });

    it('appends the next page on loadMore and stops when everything is loaded', () => {
      loadAll([summary({ id: 1 }), summary({ id: 2 })], 3);
      expect(store.hasMore()).toBeTrue();
      store.loadMore();
      const req = list();
      expect(req.request.params.get('page')).toBe('2');
      req.flush(page([summary({ id: 2 }), summary({ id: 3 })], 3, 2)); // id 2 shifted pages: shown once
      expect(store.items().map((c) => c.id)).toEqual([1, 2, 3]);
      expect(store.hasMore()).toBeFalse();
      store.loadMore();
      http.expectNone(BASE);
    });

    it('flags a failed load and reports it', () => {
      store.setScope('all');
      list().flush({ title: 'Boom' }, { status: 500, statusText: 'Server Error' });
      expect(store.failed()).toBeTrue();
      expect(store.loading()).toBeFalse();
      expect(notify.error).toHaveBeenCalled();
    });
  });

  describe('search and sort', () => {
    it('searches with the trimmed term and resets to page 1', () => {
      loadAll([summary()], 120);
      store.search('  +92 30 ');
      const req = list();
      expect(req.request.params.get('q')).toBe('+92 30');
      expect(req.request.params.has('page')).toBeFalse();
      req.flush(page([summary({ id: 9 })], 1));
      expect(store.query().q).toBe('+92 30');
      expect(store.items().map((c) => c.id)).toEqual([9]);
    });

    it('ignores a search for the same term', () => {
      loadAll([]);
      store.search('ali');
      list().flush(page([]));
      store.search(' ali ');
      http.expectNone(BASE);
      expect(store.query().q).toBe('ali');
    });

    it('drops a slow, stale response when a newer search wins', () => {
      loadAll([]);
      store.search('a');
      const first = list();
      store.search('ay');
      const reqs = http.match((r) => r.url === BASE);
      expect(first.cancelled).toBeTrue();
      reqs[0].flush(page([summary({ id: 2, firstName: 'Ayesha' })]));
      expect(store.items().map((c) => c.id)).toEqual([2]);
    });

    it('re-sorts by recent and switches to recency sections', () => {
      loadAll([summary({ id: 1, lastName: 'Khan' })]);
      expect(store.sections()[0].label).toBe('K');
      store.setSort('recent');
      const req = list();
      expect(req.request.params.get('sort')).toBe('recent');
      req.flush(page([summary({ id: 1, updatedAt: new Date().toISOString() })]));
      expect(store.sections()[0].label).toBe('Today');
    });
  });

  describe('favourites (optimistic)', () => {
    let fav: TestRequest;

    beforeEach(() => {
      loadAll([summary({ id: 5, isFavourite: false }), summary({ id: 6 })]);
      store.toggleFavourite(5);
      fav = http.expectOne(`${BASE}/5/favourite`);
    });

    it('stars immediately, before the API answers', () => {
      expect(fav.request.method).toBe('PUT');
      expect(fav.request.body).toEqual({ isFavourite: true });
      expect(store.items()[0].isFavourite).toBeTrue();
      expect(groups.adjustFavourites).toHaveBeenCalledWith(1);
      fav.flush(detail({ id: 5, isFavourite: true }));
      expect(store.items()[0].isFavourite).toBeTrue();
    });

    it('rolls back and reports when the API fails', () => {
      fav.flush({ title: 'Boom' }, { status: 500, statusText: 'Server Error' });
      expect(store.items()[0].isFavourite).toBeFalse();
      expect(groups.adjustFavourites).toHaveBeenCalledWith(-1);
      expect(notify.error).toHaveBeenCalled();
    });

    it('keeps the latest intent when a later toggle happened before the failure', () => {
      store.toggleFavourite(5); // user un-stars again while the first request is in flight
      const second = http.expectOne(`${BASE}/5/favourite`);
      fav.flush({}, { status: 500, statusText: 'Server Error' });
      expect(store.items()[0].isFavourite).toBeFalse(); // = latest intent, not a rollback to true
      second.flush(detail({ id: 5, isFavourite: false }));
    });

    it('updates the open detail too', () => {
      fav.flush(detail({ id: 5, isFavourite: true }));
      store.select(5);
      http.expectOne(`${BASE}/5`).flush(detail({ id: 5, isFavourite: true }));
      store.toggleFavourite(5);
      expect(store.selected()?.isFavourite).toBeFalse();
      http.expectOne(`${BASE}/5/favourite`).flush(detail({ id: 5, isFavourite: false }));
    });
  });

  describe('selection and mutations', () => {
    it('loads the selected contact and flags a 404 as missing', () => {
      store.select(3);
      expect(store.detailLoading()).toBeTrue();
      http.expectOne(`${BASE}/3`).flush(detail({ id: 3 }));
      expect(store.selected()?.id).toBe(3);

      store.select(4);
      http.expectOne(`${BASE}/4`).flush({ title: 'Not found' }, { status: 404, statusText: 'Not Found' });
      expect(store.detailMissing()).toBeTrue();
      expect(notify.error).not.toHaveBeenCalled();

      store.select(null);
      expect(store.selected()).toBeNull();
      expect(store.detailMissing()).toBeFalse();
    });

    it('replaces an edited row in place and refreshes the rail counts', () => {
      loadAll([summary({ id: 1, firstName: 'Ali' })]);
      store.saved(detail({ id: 1, firstName: 'Alia', displayName: 'Alia Khan' }), false);
      expect(store.items()[0].firstName).toBe('Alia');
      expect(groups.refresh).toHaveBeenCalled();
      http.expectNone(BASE);
    });

    it('reloads the list after a create', () => {
      loadAll([]);
      store.saved(detail({ id: 77 }), true);
      list().flush(page([summary({ id: 77 })]));
      expect(store.items()[0].id).toBe(77);
    });

    it('removes a deleted contact, decrements the total and clears the selection', () => {
      loadAll([summary({ id: 1 }), summary({ id: 2 })]);
      store.select(1);
      http.expectOne(`${BASE}/1`).flush(detail({ id: 1 }));
      store.remove(1).subscribe();
      http.expectOne({ method: 'DELETE', url: `${BASE}/1` }).flush(null, { status: 204, statusText: 'No Content' });
      expect(store.items().map((c) => c.id)).toEqual([2]);
      expect(store.total()).toBe(1);
      expect(store.selectedId()).toBeNull();
    });
  });
});
