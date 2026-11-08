import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, input, output, viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { ContactSummary } from '../../core/models';
import { AvatarComponent } from '../../shared/avatar.component';
import { ContactSection } from './sections';

/**
 * Sectioned contact list with sticky headers. Presentational: the page owns the store.
 * Sections use `content-visibility: auto`, so off-screen rows cost almost nothing to render; the next page
 * loads when the sentinel at the bottom scrolls into view (with a button as the accessible fallback).
 */
@Component({
  selector: 'app-contact-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule, AvatarComponent],
  template: `
    @for (section of sections(); track section.key) {
      <section class="section" [attr.aria-label]="section.label">
        @if (section.label) { <h3 class="letter">{{ section.label }}</h3> }
        <ul role="list">
          @for (c of section.items; track c.id) {
            <li class="row" [class.selected]="c.id === selectedId()">
              <a class="link" [routerLink]="link(c.id)" [attr.aria-current]="c.id === selectedId() ? 'true' : null">
                <app-avatar [name]="c.displayName" [size]="34" />
                <span class="text">
                  <span class="name">{{ c.firstName }}@if (c.lastName) { <b>{{ ' ' + c.lastName }}</b> }</span>
                  <span class="sub num">{{ secondary(c) }}</span>
                </span>
              </a>
              <button mat-icon-button class="icon-btn-s star" [class.on]="c.isFavourite" (click)="toggleFavourite.emit(c.id)"
                      [attr.aria-pressed]="c.isFavourite" [attr.aria-label]="(c.isFavourite ? 'Remove ' : 'Add ') + c.displayName + (c.isFavourite ? ' from favourites' : ' to favourites')">
                <mat-icon>{{ c.isFavourite ? 'star' : 'star_outline' }}</mat-icon>
              </button>
            </li>
          }
        </ul>
      </section>
    }

    @if (hasMore()) {
      <div class="more" #sentinel>
        @if (loadingMore()) {
          <mat-spinner diameter="18" />
        } @else {
          <button mat-stroked-button (click)="loadMore.emit()">Load more <span class="muted num">· {{ loaded() }} of {{ total() }}</span></button>
        }
      </div>
    } @else if (loaded() > 12) {
      <p class="end num">{{ total() }} contacts</p>
    }
  `,
  styleUrl: './contact-list.component.scss',
})
export class ContactListComponent {
  readonly sections = input.required<ContactSection[]>();
  readonly selectedId = input<number | null>(null);
  readonly baseUrl = input.required<string[]>();
  readonly hasMore = input(false);
  readonly loadingMore = input(false);
  readonly loaded = input(0);
  readonly total = input(0);

  readonly toggleFavourite = output<number>();
  readonly loadMore = output<void>();

  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') return;
      // Observe the host's subtree for the sentinel (it comes and goes with `hasMore`).
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting) && !this.loadingMore()) this.loadMore.emit();
        },
        { root: host.closest('.list-scroll'), rootMargin: '240px 0px' },
      );
      let observed: HTMLElement | undefined;
      const sync = () => {
        const el = this.sentinel()?.nativeElement;
        if (el === observed) return;
        if (observed) io.unobserve(observed);
        if (el) io.observe(el);
        observed = el;
      };
      const mo = new MutationObserver(sync);
      mo.observe(host, { childList: true });
      sync();
      destroyRef.onDestroy(() => {
        io.disconnect();
        mo.disconnect();
      });
    });
  }

  link(id: number): (string | number)[] {
    return [...this.baseUrl(), id];
  }

  secondary(c: ContactSummary): string {
    return c.primaryPhone ?? c.company ?? c.email ?? 'No number';
  }
}
