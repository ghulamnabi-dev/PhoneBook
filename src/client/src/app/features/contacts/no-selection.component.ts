import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ContactsStore } from './contacts.store';

/** Detail pane when nothing is selected. */
@Component({
  selector: 'app-no-selection',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="none">
      <span class="glyph"><mat-icon>person_search</mat-icon></span>
      <h2>Select a contact</h2>
      <p>Press <span class="kbd">N</span> to add one, or <span class="kbd">/</span> to search.</p>
    </div>
  `,
  styles: `
    :host { display: grid; place-items: center; height: 100%; min-height: 320px; }
    .none { display: grid; justify-items: center; gap: 6px; text-align: center; color: var(--ink-3); padding: 24px; }
    .glyph { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 50%; background: var(--surface-2); margin-bottom: 6px;
      mat-icon { font-size: 24px; width: 24px; height: 24px; } }
    h2 { margin: 0; font-size: 14px; font-weight: 600; color: var(--ink); }
    p { margin: 0; font-size: 13px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: center; }
  `,
})
export class NoSelectionComponent {
  constructor() {
    inject(ContactsStore).select(null);
  }
}
