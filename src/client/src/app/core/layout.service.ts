import { BreakpointObserver } from '@angular/cdk/layout';
import { Injectable, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

/** Breakpoints of the master–detail layout: 3 columns ≥ 1100px, 2 columns ≥ 760px, then a single column. */
export const COMPACT_QUERY = '(max-width: 1099.98px)';
export const HANDSET_QUERY = '(max-width: 759.98px)';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly bp = inject(BreakpointObserver);

  /** The rail is a drawer instead of a column. */
  readonly compact = toSignal(this.bp.observe(COMPACT_QUERY).pipe(map((r) => r.matches)), {
    initialValue: this.bp.isMatched(COMPACT_QUERY),
  });
  /** List and detail are separate screens. */
  readonly handset = toSignal(this.bp.observe(HANDSET_QUERY).pipe(map((r) => r.matches)), {
    initialValue: this.bp.isMatched(HANDSET_QUERY),
  });

  /** Drawer state while compact. */
  readonly navOpen = signal(false);
}
