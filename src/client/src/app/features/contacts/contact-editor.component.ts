import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChildren } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogConfig, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import { ContactsApi } from '../../core/api/contacts.api';
import { ContactDetail, ContactInput, PHONE_LABELS, PhoneLabel } from '../../core/models';
import { NotificationService } from '../../core/notification.service';
import { applyServerErrors } from '../../core/problem-details';
import { GroupsStore } from '../groups/groups.store';

export interface ContactEditorData {
  /** null → create. */
  contact: ContactDetail | null;
  /** Pre-filled for a new contact (e.g. the group being viewed). */
  defaults?: { groupIds: number[]; isFavourite: boolean };
}

type PhoneForm = FormGroup<{ label: FormControl<PhoneLabel>; number: FormControl<string> }>;

const optional = (v: string): string | null => (v.trim() ? v.trim() : null);

/** Create / edit a contact. Closes with the saved `ContactDetail`. */
@Component({
  selector: 'app-contact-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatSlideToggleModule, MatTooltipModule,
  ],
  templateUrl: './contact-editor.component.html',
  styleUrl: './contact-editor.component.scss',
})
export class ContactEditorComponent {
  static config(data: ContactEditorData): MatDialogConfig<ContactEditorData> {
    return { data, width: '580px', maxWidth: 'calc(100vw - 24px)', autoFocus: 'first-tabbable', restoreFocus: true };
  }

  private readonly data = inject<ContactEditorData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<ContactEditorComponent, ContactDetail>>(MatDialogRef);
  private readonly api = inject(ContactsApi);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly groups = inject(GroupsStore).groups;

  readonly labels = PHONE_LABELS;
  readonly editing = this.data.contact;
  readonly saving = signal(false);
  private readonly numberInputs = viewChildren<ElementRef<HTMLInputElement>>('numberInput');

  readonly form = this.fb.group({
    firstName: [this.editing?.firstName ?? '', [Validators.required, Validators.maxLength(80)]],
    lastName: [this.editing?.lastName ?? '', Validators.maxLength(80)],
    company: [this.editing?.company ?? '', Validators.maxLength(120)],
    email: [this.editing?.email ?? '', [Validators.email, Validators.maxLength(200)]],
    phones: this.fb.array<PhoneForm>([], Validators.minLength(1)),
    groupIds: this.fb.control<number[]>(this.editing?.groups.map((g) => g.id) ?? this.data.defaults?.groupIds ?? []),
    notes: [this.editing?.notes ?? '', Validators.maxLength(2000)],
    isFavourite: [this.editing?.isFavourite ?? this.data.defaults?.isFavourite ?? false],
  });

  get phones(): FormArray<PhoneForm> {
    return this.form.controls.phones;
  }

  constructor() {
    const existing = this.editing?.phones ?? [];
    if (existing.length) existing.forEach((p) => this.phones.push(this.phoneRow(p.label, p.number)));
    else this.phones.push(this.phoneRow());
  }

  addPhone(): void {
    const used = new Set(this.phones.controls.map((c) => c.controls.label.value));
    const label = PHONE_LABELS.find((l) => !used.has(l)) ?? 'Other';
    this.phones.push(this.phoneRow(label));
    // Focus the new number field once it renders.
    setTimeout(() => this.numberInputs().at(-1)?.nativeElement.focus());
  }

  removePhone(index: number): void {
    if (this.phones.length > 1) this.phones.removeAt(index);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const input: ContactInput = {
      firstName: v.firstName.trim(),
      lastName: optional(v.lastName),
      company: optional(v.company),
      email: optional(v.email),
      notes: optional(v.notes),
      isFavourite: v.isFavourite,
      phones: v.phones.map((p) => ({ label: p.label, number: p.number.trim() })),
      groupIds: v.groupIds,
    };
    const request: Observable<ContactDetail> = this.editing ? this.api.update(this.editing.id, input) : this.api.create(input);
    request.subscribe({
      next: (saved) => this.ref.close(saved),
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        if (err.status === 404) {
          this.notify.error('This contact was deleted in the meantime.');
          this.ref.close();
          return;
        }
        const { handled, unmapped } = applyServerErrors(this.form, err);
        if (!handled) this.notify.error(err);
        else if (unmapped.length) this.notify.error(unmapped[0]);
      },
    });
  }

  private phoneRow(label: PhoneLabel = 'Mobile', number = ''): PhoneForm {
    return this.fb.group({
      label: this.fb.control<PhoneLabel>(label),
      number: this.fb.control(number, [Validators.required, Validators.minLength(5), Validators.maxLength(25), Validators.pattern(/\d/)]),
    });
  }
}
