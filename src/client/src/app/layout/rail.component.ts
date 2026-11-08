import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, inject, output, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { Group } from '../core/models';
import { NotificationService } from '../core/notification.service';
import { problemMessage, validationProblem, firstValidationMessage } from '../core/problem-details';
import { ThemeService } from '../core/theme.service';
import { AvatarComponent } from '../shared/avatar.component';
import { ConfirmData, ConfirmDialogComponent } from '../shared/confirm-dialog.component';
import { ContactsStore } from '../features/contacts/contacts.store';
import { GroupDialogComponent } from '../features/groups/group-dialog.component';
import { GroupsStore } from '../features/groups/groups.store';

/** Left rail: scopes, groups (add / inline rename / delete), theme and account. */
@Component({
  selector: 'app-rail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, RouterLinkActive, MatIconModule, MatButtonModule, MatMenuModule, MatDividerModule, MatTooltipModule, AvatarComponent],
  templateUrl: './rail.component.html',
  styleUrl: './rail.component.scss',
})
export class RailComponent {
  private readonly auth = inject(AuthService);
  private readonly store = inject(GroupsStore);
  private readonly contacts = inject(ContactsStore);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  readonly theme = inject(ThemeService);

  /** A link was followed — the shell closes the drawer on small screens. */
  readonly navigated = output<void>();

  readonly groups = this.store.groups;
  readonly totals = this.store.totals;
  readonly loaded = this.store.loaded;
  readonly userName = this.auth.userName;
  readonly userEmail = this.auth.userEmail;

  readonly editingId = signal<number | null>(null);
  readonly renameError = signal<string | null>(null);
  readonly renameControl = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] });
  private readonly renameInput = viewChild<ElementRef<HTMLInputElement>>('renameInput');
  private renaming = false;

  constructor() {
    // Focus and select the inline editor as soon as it renders.
    afterRenderEffect(() => {
      const input = this.renameInput()?.nativeElement;
      if (input && document.activeElement !== input) {
        input.focus();
        input.select();
      }
    });
  }

  addGroup(): void {
    this.dialog
      .open<GroupDialogComponent, void, Group>(GroupDialogComponent, { autoFocus: 'dialog' })
      .afterClosed()
      .pipe(filter((g): g is Group => !!g))
      .subscribe((group) => {
        this.notify.success(`Group “${group.name}” created.`);
        void this.router.navigate(['/app/groups', group.id]);
        this.navigated.emit();
      });
  }

  startRename(group: Group): void {
    this.renameControl.setValue(group.name);
    this.renameError.set(null);
    this.editingId.set(group.id);
  }

  cancelRename(): void {
    this.editingId.set(null);
    this.renameError.set(null);
  }

  commitRename(group: Group): void {
    if (this.renaming || this.editingId() !== group.id) return;
    const name = this.renameControl.value.trim();
    if (!name || name === group.name) {
      this.cancelRename();
      return;
    }
    this.renaming = true;
    this.store.rename(group.id, name).subscribe({
      next: () => {
        this.renaming = false;
        this.cancelRename();
        this.contacts.refresh(); // group chips on contacts show the old name until reloaded
      },
      error: (err: HttpErrorResponse) => {
        this.renaming = false;
        const problem = validationProblem(err);
        const message = err.status === 409 ? problemMessage(err) : problem ? firstValidationMessage(problem) : null;
        if (message) {
          this.renameError.set(message);
          this.renameInput()?.nativeElement.focus();
        } else {
          this.cancelRename();
          this.notify.error(err);
        }
      },
    });
  }

  deleteGroup(group: Group): void {
    const people = group.contactCount === 1 ? '1 contact' : `${group.contactCount} contacts`;
    this.dialog
      .open<ConfirmDialogComponent, ConfirmData, boolean>(ConfirmDialogComponent, {
        data: {
          title: `Delete “${group.name}”?`,
          message: group.contactCount
            ? `The ${people} in this group stay in your address book — they just leave the group.`
            : 'This group is empty.',
          confirmLabel: 'Delete group',
          destructive: true,
        },
        width: '420px',
      })
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap(() => this.store.remove(group.id)),
      )
      .subscribe({
        next: () => {
          this.notify.success(`Group “${group.name}” deleted.`);
          const q = this.contacts.query();
          if (q.scope === 'group' && q.groupId === group.id) void this.router.navigate(['/app/contacts']);
          this.contacts.refresh();
        },
        error: (err: HttpErrorResponse) => this.notify.error(err),
      });
  }

  logout(): void {
    this.auth.logout();
  }
}
