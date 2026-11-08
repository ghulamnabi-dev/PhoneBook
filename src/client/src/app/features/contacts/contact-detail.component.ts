import { Clipboard } from '@angular/cdk/clipboard';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { ContactsApi } from '../../core/api/contacts.api';
import { saveResponse } from '../../core/download';
import { LayoutService } from '../../core/layout.service';
import { ContactDetail } from '../../core/models';
import { NotificationService } from '../../core/notification.service';
import { AvatarComponent } from '../../shared/avatar.component';
import { ConfirmData, ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { RelativeTimePipe } from '../../shared/relative-time.pipe';
import { ContactEditorComponent, ContactEditorData } from './contact-editor.component';
import { ContactsStore } from './contacts.store';

/** Right pane (or full screen on phones): one contact, from the `:id` route param. */
@Component({
  selector: 'app-contact-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule, MatTooltipModule, AvatarComponent, EmptyStateComponent, RelativeTimePipe],
  templateUrl: './contact-detail.component.html',
  styleUrl: './contact-detail.component.scss',
})
export class ContactDetailComponent {
  readonly store = inject(ContactsStore);
  readonly layout = inject(LayoutService);
  private readonly api = inject(ContactsApi);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly clipboard = inject(Clipboard);
  private readonly notify = inject(NotificationService);

  /** Route param. */
  readonly id = input.required<string>();

  readonly exporting = signal(false);
  readonly contact = computed(() => {
    const c = this.store.selected();
    return c && c.id === this.store.selectedId() ? c : null;
  });
  /** Name, company and star are known from the list row before the detail arrives. */
  readonly heading = computed(() => this.contact() ?? this.store.selectedSummary());

  constructor() {
    effect(() => {
      const id = Number(this.id());
      untracked(() => (Number.isInteger(id) && id > 0 ? this.store.select(id) : this.store.detailMissing.set(true)));
    });
  }

  back(): void {
    void this.router.navigate(this.store.baseUrl());
  }

  /** `tel:` wants digits and a leading + only. */
  dialable(number: string): string {
    const trimmed = number.trim();
    return (trimmed.startsWith('+') ? '+' : '') + trimmed.replace(/[^\d]/g, '');
  }

  copy(text: string): void {
    if (this.clipboard.copy(text)) this.notify.success(`Copied ${text}`);
    else this.notify.error('Could not copy to the clipboard.');
  }

  edit(contact: ContactDetail): void {
    this.dialog
      .open<ContactEditorComponent, ContactEditorData, ContactDetail>(ContactEditorComponent, ContactEditorComponent.config({ contact }))
      .afterClosed()
      .pipe(filter((c): c is ContactDetail => !!c))
      .subscribe((saved) => {
        this.store.saved(saved, false);
        this.notify.success('Changes saved.');
      });
  }

  exportVcf(contact: ContactDetail): void {
    this.exporting.set(true);
    const fallback = `${contact.displayName.toLowerCase().replace(/\s+/g, '-')}.vcf`;
    this.api.exportOne(contact.id).subscribe({
      next: (res) => {
        this.exporting.set(false);
        this.notify.success(`Downloaded ${saveResponse(res, fallback)}.`);
      },
      error: (err: HttpErrorResponse) => {
        this.exporting.set(false);
        this.notify.error(err);
      },
    });
  }

  remove(contact: ContactDetail): void {
    this.dialog
      .open<ConfirmDialogComponent, ConfirmData, boolean>(ConfirmDialogComponent, {
        data: {
          title: `Delete ${contact.displayName}?`,
          message: 'Their numbers, e-mail and notes will be removed. This cannot be undone.',
          confirmLabel: 'Delete',
          destructive: true,
        },
        width: '420px',
      })
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap(() => this.store.remove(contact.id)),
      )
      .subscribe({
        next: () => {
          this.notify.success(`${contact.displayName} deleted.`);
          this.back();
        },
        error: (err: HttpErrorResponse) => this.notify.error(err),
      });
  }
}
