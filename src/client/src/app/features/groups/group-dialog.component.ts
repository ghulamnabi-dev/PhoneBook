import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Group } from '../../core/models';
import { NotificationService } from '../../core/notification.service';
import { applyServerErrors, problemMessage } from '../../core/problem-details';
import { GroupsStore } from './groups.store';

/** New group. Closes with the created group. */
@Component({
  selector: 'app-group-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>New group</h2>
    <form [formGroup]="form" (ngSubmit)="save()" novalidate>
      <mat-dialog-content class="dialog-form">
        <p class="hint">Groups are labels — a contact can be in several, and deleting a group keeps its contacts.</p>
        <mat-form-field>
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" maxlength="60" autocomplete="off" cdkFocusInitial placeholder="e.g. Cricket club" />
          @if (form.controls.name.hasError('server')) { <mat-error>{{ form.controls.name.getError('server') }}</mat-error> }
          @else if (form.controls.name.invalid) { <mat-error>Give the group a name.</mat-error> }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button type="submit" [disabled]="saving()">Create group</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .dialog-form { width: min(400px, 80vw); }
    .hint { margin: 0 0 14px; font-size: 12.5px; color: var(--ink-3); }
  `,
})
export class GroupDialogComponent {
  private readonly ref = inject<MatDialogRef<GroupDialogComponent, Group>>(MatDialogRef);
  private readonly store = inject(GroupsStore);
  private readonly notify = inject(NotificationService);

  readonly saving = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60), Validators.pattern(/\S/)]],
  });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.store.create(this.form.getRawValue().name).subscribe({
      next: (group) => this.ref.close(group),
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        if (err.status === 409) {
          this.form.controls.name.setErrors({ server: problemMessage(err) ?? 'A group with that name already exists.' });
          return;
        }
        if (!applyServerErrors(this.form, err).handled) this.notify.error(err);
      },
    });
  }
}
