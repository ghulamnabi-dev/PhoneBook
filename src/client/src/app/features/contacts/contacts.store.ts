import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, map, switchMap, tap } from 'rxjs';
import { ContactsApi } from '../../core/api/contacts.api';
import { ContactDetail, ContactQuery, ContactScope, ContactSort, ContactSummary } from '../../core/models';
import { NotificationService } from '../../core/notification.service';
import { GroupsStore } from '../groups/groups.store';
import { ContactSection, sectionsByLetter, sectionsByRecency } from './sections';

export const PAGE_SIZE = 50;

export interface ListQuery {
  scope: ContactScope;
  groupId: number | null;
  q: string;
  sort: ContactSort;
}

interface PageRequest {
  query: ListQuery;
  page: number;
}

const summaryOf = (d: ContactDetail): ContactSummary => ({
  id: d.id,
  firstName: d.firstName,
  lastName: d.lastName,
  displayName: d.displayName,
  company: d.company,
  isFavourite: d.isFavourite,
  primaryPhone: d.primaryPhone,
  email: d.email,
  groups: d.groups,
  updatedAt: d.updatedAt,
});

/**
 * State of the contacts screen: the current list query, the loaded pages and the selected contact.
 * Requests go through `switchMap`, so a newer query always wins over a slower, older response.
 */
@Injectable({ providedIn: 'root' })
export class ContactsStore {
  private readonly api = inject(ContactsApi);
  private readonly groups = inject(GroupsStore);
  private readonly notify = inject(NotificationService);

  // List ---------------------------------------------------------------------------------------------------
  readonly query = signal<ListQuery>({ scope: 'all', groupId: null, q: '', sort: 'name' });
  readonly items = signal<ContactSummary[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  /** The last list request failed (shown as an inline retry instead of an empty state). */
  readonly failed = signal(false);

  readonly hasMore = computed(() => this.items().length < this.total());
  readonly sections = computed<ContactSection[]>(() =>
    this.query().sort === 'name' ? sectionsByLetter(this.items()) : sectionsByRecency(this.items()),
  );
  /** Router link of the current scope; the detail route is `[...baseUrl, id]`. */
  readonly baseUrl = computed<string[]>(() => {
    const { scope, groupId } = this.query();
    if (scope === 'favourites') return ['/app', 'favourites'];
    if (scope === 'group' && groupId != null) return ['/app', 'groups', String(groupId)];
    return ['/app', 'contacts'];
  });

  // Selection ----------------------------------------------------------------------------------------------
  readonly selectedId = signal<number | null>(null);
  readonly selected = signal<ContactDetail | null>(null);
  readonly detailLoading = signal(false);
  /** The selected id does not exist (or belongs to someone else — the API answers 404 either way). */
  readonly detailMissing = signal(false);
  /** What we already know about the selection from the list, shown while the detail loads. */
  readonly selectedSummary = computed(() => {
    const id = this.selectedId();
    return id == null ? null : (this.items().find((c) => c.id === id) ?? null);
  });

  private readonly pages = new Subject<PageRequest>();
  private readonly details = new Subject<number>();

  constructor() {
    this.pages
      .pipe(
        switchMap(({ query, page }) =>
          this.api.search(toApiQuery(query, page)).pipe(
            map((result) => ({ result, page })),
            catchError((err: HttpErrorResponse) => {
              this.loading.set(false);
              this.loadingMore.set(false);
              this.failed.set(true);
              this.notify.error(err);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ result, page }) => {
        this.items.update((current) => (page === 1 ? result.items : dedupe([...current, ...result.items])));
        this.total.set(result.total);
        this.page.set(page);
        this.loading.set(false);
        this.loadingMore.set(false);
        this.failed.set(false);
      });

    this.details
      .pipe(
        switchMap((id) =>
          this.api.get(id).pipe(
            catchError((err: HttpErrorResponse) => {
              this.detailLoading.set(false);
              if (err.status === 404) this.detailMissing.set(true);
              else this.notify.error(err);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((detail) => {
        if (detail.id !== this.selectedId()) return;
        this.selected.set(detail);
        this.detailLoading.set(false);
      });
  }

  // Query --------------------------------------------------------------------------------------------------

  /** Called by the route: switch between all / favourites / one group. No-op when nothing changed. */
  setScope(scope: ContactScope, groupId: number | null = null): void {
    const current = this.query();
    const loadedOnce = this.page() > 0 || this.loading();
    if (loadedOnce && current.scope === scope && current.groupId === groupId) return;
    this.query.set({ ...current, scope, groupId: scope === 'group' ? groupId : null });
    this.reload();
  }

  search(q: string): void {
    const term = q.trim();
    if (term === this.query().q) return;
    this.query.update((s) => ({ ...s, q: term }));
    this.reload();
  }

  setSort(sort: ContactSort): void {
    if (sort === this.query().sort) return;
    this.query.update((s) => ({ ...s, sort }));
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.pages.next({ query: this.query(), page: 1 });
  }

  /** Reload the list and re-fetch the selected contact (after group renames/deletes elsewhere). */
  refresh(): void {
    this.reload();
    const id = this.selectedId();
    if (id != null) {
      this.detailLoading.set(true);
      this.details.next(id);
    }
  }

  loadMore(): void {
    if (!this.hasMore() || this.loading() || this.loadingMore()) return;
    this.loadingMore.set(true);
    this.pages.next({ query: this.query(), page: this.page() + 1 });
  }

  // Selection ----------------------------------------------------------------------------------------------

  select(id: number | null): void {
    if (id === this.selectedId() && (id === null || this.selected()?.id === id || this.detailLoading())) return;
    this.selectedId.set(id);
    this.detailMissing.set(false);
    if (id == null) {
      this.selected.set(null);
      this.detailLoading.set(false);
      return;
    }
    if (this.selected()?.id !== id) this.selected.set(null);
    this.detailLoading.set(true);
    this.details.next(id);
  }

  // Mutations ----------------------------------------------------------------------------------------------

  /**
   * Star / unstar immediately, then confirm with the API. On failure the previous value is restored —
   * unless the user has toggled again in the meantime, in which case their latest intent stands.
   */
  toggleFavourite(id: number): void {
    const current = this.items().find((c) => c.id === id)?.isFavourite ?? this.selected()?.isFavourite;
    if (current === undefined) return;
    const next = !current;
    this.patch(id, { isFavourite: next });
    this.groups.adjustFavourites(next ? 1 : -1);

    this.api.setFavourite(id, next).subscribe({
      next: (detail) => {
        if (this.selected()?.id === id) this.selected.set(detail);
      },
      error: (err: HttpErrorResponse) => {
        if (this.favouriteOf(id) === next) {
          this.patch(id, { isFavourite: current });
          this.groups.adjustFavourites(next ? -1 : 1);
        }
        this.notify.error(err.status === 404 ? 'That contact no longer exists.' : err);
      },
    });
  }

  /** After the editor saved: show the new state and refresh the list so ordering and counts are right. */
  saved(detail: ContactDetail, created: boolean): void {
    if (created) {
      this.reload();
    } else {
      this.items.update((list) => list.map((c) => (c.id === detail.id ? summaryOf(detail) : c)));
    }
    if (this.selectedId() === detail.id) this.selected.set(detail);
    this.groups.refresh();
  }

  remove(id: number): Observable<void> {
    return this.api.delete(id).pipe(
      tap(() => {
        const had = this.items().some((c) => c.id === id);
        this.items.update((list) => list.filter((c) => c.id !== id));
        if (had) this.total.update((t) => Math.max(0, t - 1));
        if (this.selectedId() === id) this.select(null);
        this.groups.refresh();
      }),
    );
  }

  private favouriteOf(id: number): boolean | undefined {
    return this.items().find((c) => c.id === id)?.isFavourite ?? (this.selected()?.id === id ? this.selected()!.isFavourite : undefined);
  }

  private patch(id: number, changes: Partial<ContactSummary>): void {
    this.items.update((list) => list.map((c) => (c.id === id ? { ...c, ...changes } : c)));
    const sel = this.selected();
    if (sel?.id === id) this.selected.set({ ...sel, ...changes });
  }
}

export function toApiQuery(query: ListQuery, page: number): ContactQuery {
  return {
    q: query.q || undefined,
    groupId: query.scope === 'group' ? (query.groupId ?? undefined) : undefined,
    favourites: query.scope === 'favourites' || undefined,
    sort: query.sort,
    page,
    pageSize: PAGE_SIZE,
  };
}

/** A contact edited between two page loads can shift pages; never show it twice. */
function dedupe(list: ContactSummary[]): ContactSummary[] {
  const seen = new Set<number>();
  return list.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
}
