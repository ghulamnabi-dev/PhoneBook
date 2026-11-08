import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterOutlet } from '@angular/router';
import { LayoutService } from '../core/layout.service';
import { GroupsStore } from '../features/groups/groups.store';
import { RailComponent } from './rail.component';

/** Rail + content. The rail is a fixed column on desktop and a drawer below 1100px. */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, MatSidenavModule, RailComponent],
  template: `
    <mat-sidenav-container class="shell" [hasBackdrop]="layout.compact()">
      <mat-sidenav class="rail" [mode]="layout.compact() ? 'over' : 'side'" [opened]="opened()"
                   (openedChange)="layout.navOpen.set($event)" [fixedInViewport]="layout.compact()" [autoFocus]="false">
        <app-rail (navigated)="layout.navOpen.set(false)" />
      </mat-sidenav>
      <mat-sidenav-content class="content">
        <router-outlet />
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    .shell { height: 100vh; height: 100dvh; }
    .rail { width: 220px; border-right: 1px solid var(--line); }
    .content { height: 100%; overflow: hidden; }
  `,
})
export class ShellComponent {
  readonly layout = inject(LayoutService);
  readonly opened = computed(() => !this.layout.compact() || this.layout.navOpen());

  constructor() {
    inject(GroupsStore).refresh();
  }
}
