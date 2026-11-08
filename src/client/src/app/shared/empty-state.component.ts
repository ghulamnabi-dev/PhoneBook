import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  imports: [MatIconModule],
  template: `
    <div class="empty">
      <mat-icon>{{ icon() }}</mat-icon>
      <h3>{{ title() }}</h3>
      @if (message()) { <p>{{ message() }}</p> }
      <ng-content />
    </div>
  `,
  styles: `
    .empty { display: grid; justify-items: center; text-align: center; gap: 6px; padding: 48px 24px; color: var(--ink-3);
      mat-icon { font-size: 28px; width: 28px; height: 28px; margin-bottom: 4px; }
      h3 { margin: 0; font-size: 14px; font-weight: 600; color: var(--ink); }
      p { margin: 0 0 8px; max-width: 40ch; font-size: 13px; } }
  `,
})
export class EmptyStateComponent {
  icon = input('inbox');
  title = input.required<string>();
  message = input<string>();
}
