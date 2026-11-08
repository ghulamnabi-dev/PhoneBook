import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValidationMessage, problemMessage, validationProblem } from './problem-details';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snack = inject(MatSnackBar);

  success(message: string): void {
    this.snack.open(message, undefined, { duration: 3000, panelClass: 'snack-success' });
  }

  error(message: string | HttpErrorResponse): void {
    const text = typeof message === 'string' ? message : this.describe(message);
    this.snack.open(text, 'Dismiss', { duration: 6000, panelClass: 'snack-error' });
  }

  private describe(err: HttpErrorResponse): string {
    if (err.status === 0) return 'Cannot reach the API. Is the server running?';
    if (err.status === 403) return 'You don’t have access to that.';
    const problem = validationProblem(err);
    if (problem) {
      const first = firstValidationMessage(problem);
      const title = problem.title?.trim();
      if (title && first) return `${title}${/[.!?:]$/.test(title) ? ' ' : ': '}${first}`;
      return first ?? title ?? 'Please check the form and try again.';
    }
    if (typeof err.error === 'string' && err.error.length < 200) return err.error;
    const fromBody = problemMessage(err);
    if (fromBody) return fromBody;
    if (err.status === 401) return 'Your session has expired. Please sign in again.';
    if (err.status === 404) return 'Not found.';
    return `Request failed (${err.status}).`;
  }
}
