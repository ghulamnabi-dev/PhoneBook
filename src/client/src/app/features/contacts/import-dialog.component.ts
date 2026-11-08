import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ContactsApi } from '../../core/api/contacts.api';
import { ImportResult } from '../../core/models';
import { NotificationService } from '../../core/notification.service';
import { ImportFailure, importFailure, importSummary } from './import-errors';

type Phase = 'pick' | 'uploading' | 'done' | 'failed';

const MAX_BYTES = 5 * 1024 * 1024;

/** Upload a .vcf file. Closes with the ImportResult (or nothing if cancelled / failed). */
@Component({
  selector: 'app-import-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './import-dialog.component.html',
  styleUrl: './import-dialog.component.scss',
})
export class ImportDialogComponent {
  private readonly api = inject(ContactsApi);
  private readonly notify = inject(NotificationService);
  readonly ref = inject<MatDialogRef<ImportDialogComponent, ImportResult>>(MatDialogRef);

  readonly phase = signal<Phase>('pick');
  readonly file = signal<File | null>(null);
  readonly fileError = signal<string | null>(null);
  readonly dragging = signal(false);
  readonly result = signal<ImportResult | null>(null);
  readonly failure = signal<ImportFailure | null>(null);
  readonly summary = importSummary;

  onPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.choose(input.files?.[0] ?? null);
    input.value = ''; // picking the same file again should still fire `change`
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.dragging.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.choose(event.dataTransfer?.files?.[0] ?? null);
  }

  choose(file: File | null): void {
    this.failure.set(null);
    this.phase.set('pick');
    if (!file) return;
    if (!/\.(vcf|vcard)$/i.test(file.name)) {
      this.file.set(null);
      this.fileError.set(`“${file.name}” isn't a vCard. Choose a .vcf file.`);
      return;
    }
    if (file.size > MAX_BYTES) {
      this.file.set(null);
      this.fileError.set('That file is larger than 5 MB.');
      return;
    }
    this.fileError.set(null);
    this.file.set(file);
  }

  upload(): void {
    const file = this.file();
    if (!file) return;
    this.phase.set('uploading');
    this.api.import(file).subscribe({
      next: (result) => {
        this.result.set(result);
        this.phase.set('done');
        if (result.imported > 0) this.notify.success(importSummary(result.imported, result.skipped) + '.');
      },
      error: (err: HttpErrorResponse) => {
        const failure = importFailure(err);
        if (!failure) {
          this.phase.set('pick');
          this.notify.error(err);
          return;
        }
        this.failure.set(failure);
        this.phase.set('failed');
      },
    });
  }

  retry(): void {
    this.file.set(null);
    this.failure.set(null);
    this.phase.set('pick');
  }

  close(): void {
    this.ref.close(this.result() ?? undefined);
  }

  size(bytes: number): string {
    return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}
