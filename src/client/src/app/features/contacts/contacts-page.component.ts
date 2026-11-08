import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterOutlet } from '@angular/router';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs';
import { ContactsApi } from '../../core/api/contacts.api';
import { saveResponse } from '../../core/download';
import { LayoutService } from '../../core/layout.service';
import { ContactDetail, ContactScope, ImportResult } from '../../core/models';
import { NotificationService } from '../../core/notification.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { GroupsStore } from '../groups/groups.store';
import { ContactEditorComponent, ContactEditorData } from './contact-editor.component';
import { ContactListComponent } from './contact-list.component';
import { ContactsStore } from './contacts.store';
import { ImportDialogComponent } from './import-dialog.component';

export const SEARCH_DEBOUNCE_MS = 250;

/** Elements where single-key shortcuts must not fire. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || !!target.closest('[role="listbox"],[role="menu"]');
}

/** List column + detail outlet. Shortcuts: "/" search, "N" new contact, ↑/↓ move, Esc clear selection. */
@Component({
  selector: 'app-contacts-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, RouterOutlet, MatButtonModule, MatButtonToggleModule, MatIconModule, MatMenuModule, MatTooltipModule,
    EmptyStateComponent, ContactListComponent,
  ],
  templateUrl: './contacts-page.component.html',
  styleUrl: './contacts-page.component.scss',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class ContactsPageComponent {
  readonly store = inject(ContactsStore);
  readonly layout = inject(LayoutService);
  private readonly groups = inject(GroupsStore);
  private readonly api = inject(ContactsApi);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  /** From route data. */
  readonly scope = input<ContactScope>('all');
  /** From the `groups/:groupId` route param. */
  readonly groupId = input<string>();

  readonly query = this.store.query;
  readonly selectedId = this.store.selectedId;
  readonly exporting = signal(false);
  readonly skeletonRows = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  readonly search = new FormControl(this.store.query().q, { nonNullable: true });
  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  readonly title = computed(() => {
    const { scope, groupId } = this.query();
    if (scope === 'favourites') return 'Favourites';
    if (scope === 'group') return this.groups.byId(groupId)?.name ?? 'Group';
    return 'All contacts';
  });

  readonly summary = computed(() => {
    if (this.store.loading() && !this.store.items().length) return '';
    const total = this.store.total();
    if (this.query().q) return total === 1 ? '1 match' : `${total} matches`;
    return total === 1 ? '1 contact' : `${total} contacts`;
  });

  readonly emptyKind = computed(() => (this.query().q ? 'search' : this.query().scope));

  constructor() {
    effect(() => {
      const scope = this.scope();
      const id = Number(this.groupId());
      untracked(() => this.store.setScope(scope, scope === 'group' && Number.isFinite(id) ? id : null));
    });

    this.search.valueChanges
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((q) => this.store.search(q));
  }

  searchNow(): void {
    this.store.search(this.search.value);
  }

  clearSearch(event?: Event): void {
    if (event && !this.search.value) {
      (event.target as HTMLElement).blur();
      return;
    }
    event?.stopPropagation();
    this.search.setValue('');
    this.store.search('');
    this.searchInput().nativeElement.focus();
  }

  newContact(): void {
    const { scope, groupId } = this.query();
    const data: ContactEditorData = {
      contact: null,
      defaults: { groupIds: scope === 'group' && groupId != null ? [groupId] : [], isFavourite: scope === 'favourites' },
    };
    this.dialog
      .open<ContactEditorComponent, ContactEditorData, ContactDetail>(ContactEditorComponent, ContactEditorComponent.config(data))
      .afterClosed()
      .pipe(filter((c): c is ContactDetail => !!c))
      .subscribe((created) => {
        this.store.saved(created, true);
        this.notify.success(`${created.displayName} added.`);
        void this.router.navigate([...this.store.baseUrl(), created.id]);
      });
  }

  openImport(): void {
    this.dialog
      .open<ImportDialogComponent, void, ImportResult>(ImportDialogComponent, { width: '520px', maxWidth: 'calc(100vw - 32px)', autoFocus: false })
      .afterClosed()
      .pipe(filter((r): r is ImportResult => !!r && r.imported > 0))
      .subscribe(() => {
        this.store.reload();
        this.groups.refresh();
      });
  }

  exportAll(): void {
    const { scope, groupId } = this.query();
    this.exporting.set(true);
    this.api.exportAll(scope === 'group' ? (groupId ?? undefined) : undefined).subscribe({
      next: (res) => {
        this.exporting.set(false);
        this.notify.success(`Downloaded ${saveResponse(res, 'contacts.vcf')}.`);
      },
      error: (err: HttpErrorResponse) => {
        this.exporting.set(false);
        this.notify.error(err);
      },
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (this.dialog.openDialogs.length || isTyping(event.target)) return;

    switch (event.key) {
      case '/':
        event.preventDefault();
        this.searchInput().nativeElement.focus();
        this.searchInput().nativeElement.select();
        break;
      case 'n':
      case 'N':
        event.preventDefault();
        this.newContact();
        break;
      case 'Escape':
        if (this.selectedId() !== null) {
          event.preventDefault();
          void this.router.navigate(this.store.baseUrl());
        }
        break;
      case 'ArrowDown':
      case 'ArrowUp':
        if (this.move(event.key === 'ArrowDown' ? 1 : -1)) event.preventDefault();
        break;
    }
  }

  /** Select the next / previous contact in list order. */
  private move(step: 1 | -1): boolean {
    const items = this.store.sections().flatMap((s) => s.items);
    if (!items.length) return false;
    const at = items.findIndex((c) => c.id === this.selectedId());
    const next = items[at === -1 ? (step === 1 ? 0 : items.length - 1) : Math.min(items.length - 1, Math.max(0, at + step))];
    if (!next || next.id === this.selectedId()) return false;
    void this.router.navigate([...this.store.baseUrl(), next.id]).then(() => {
      document.querySelector<HTMLElement>('.row.selected')?.scrollIntoView({ block: 'nearest' });
    });
    return true;
  }
}
