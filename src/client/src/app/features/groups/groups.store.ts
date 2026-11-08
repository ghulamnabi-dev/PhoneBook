import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, forkJoin, map, tap } from 'rxjs';
import { ContactsApi } from '../../core/api/contacts.api';
import { GroupsApi } from '../../core/api/groups.api';
import { Group } from '../../core/models';
import { NotificationService } from '../../core/notification.service';

export interface Totals {
  all: number;
  favourites: number;
}

const byName = (a: Group, b: Group) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

/**
 * Groups plus the counts shown in the rail. The API has no "counts" endpoint, so the totals for
 * "All contacts" and "Favourites" come from `total` of a one-row search each.
 */
@Injectable({ providedIn: 'root' })
export class GroupsStore {
  private readonly api = inject(GroupsApi);
  private readonly contacts = inject(ContactsApi);
  private readonly notify = inject(NotificationService);

  readonly groups = signal<Group[]>([]);
  readonly totals = signal<Totals>({ all: 0, favourites: 0 });
  readonly loaded = signal(false);

  private readonly index = computed(() => new Map(this.groups().map((g) => [g.id, g])));

  byId(id: number | null | undefined): Group | undefined {
    return id == null ? undefined : this.index().get(id);
  }

  refresh(): void {
    forkJoin({
      groups: this.api.list(),
      all: this.contacts.search({ pageSize: 1 }).pipe(map((p) => p.total)),
      favourites: this.contacts.search({ favourites: true, pageSize: 1 }).pipe(map((p) => p.total)),
    }).subscribe({
      next: ({ groups, all, favourites }) => {
        this.groups.set([...groups].sort(byName));
        this.totals.set({ all, favourites });
        this.loaded.set(true);
      },
      error: (err) => this.notify.error(err),
    });
  }

  /** Optimistic nudge of the favourites count (the contacts store owns the actual toggle). */
  adjustFavourites(delta: number): void {
    this.totals.update((t) => ({ ...t, favourites: Math.max(0, t.favourites + delta) }));
  }

  create(name: string): Observable<Group> {
    return this.api.create(name.trim()).pipe(tap((g) => this.groups.update((list) => [...list, g].sort(byName))));
  }

  rename(id: number, name: string): Observable<Group> {
    return this.api
      .rename(id, name.trim())
      .pipe(tap((g) => this.groups.update((list) => list.map((x) => (x.id === id ? { ...x, name: g.name } : x)).sort(byName))));
  }

  remove(id: number): Observable<void> {
    return this.api.delete(id).pipe(tap(() => this.groups.update((list) => list.filter((g) => g.id !== id))));
  }
}
