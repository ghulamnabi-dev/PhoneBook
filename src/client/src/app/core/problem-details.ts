import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormGroup } from '@angular/forms';

/** ASP.NET Core ValidationProblemDetails: field names are PascalCase. */
export interface ValidationProblem {
  title?: string;
  errors: Record<string, string[] | string>;
}

/** RFC 7807 ProblemDetails (404, 409, …). */
export interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

export function validationProblem(err: unknown): ValidationProblem | null {
  if (!(err instanceof HttpErrorResponse) || err.status !== 400) return null;
  const body: unknown = err.error;
  return isRecord(body) && isRecord(body['errors']) ? (body as unknown as ValidationProblem) : null;
}

/** The `detail` or `title` of a ProblemDetails body, if there is one. */
export function problemMessage(err: unknown): string | null {
  if (!(err instanceof HttpErrorResponse) || !isRecord(err.error)) return null;
  const { detail, title } = err.error as ProblemDetails;
  if (typeof detail === 'string' && detail.trim()) return detail.trim();
  if (typeof title === 'string' && title.trim()) return title.trim();
  return null;
}

const camel = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** "FirstName" / "$.firstName" / "body.FirstName" → "firstName". */
export function toControlName(field: string): string {
  return camel(field.split('.').pop() ?? field);
}

/**
 * "Phones[1].Number" → "phones.1.number"; "$.phones[0].label" → "phones.0.label"; "Email" → "email".
 * Usable with `FormGroup.get()` so errors land on FormArray rows too.
 */
export function toControlPath(field: string): string {
  return field
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter((part) => part && part !== '$' && part.toLowerCase() !== 'body')
    .map(camel)
    .join('.');
}

function messages(value: string[] | string): string[] {
  return (Array.isArray(value) ? value : [value]).filter((m) => typeof m === 'string' && m.length > 0);
}

/** First message of a validation problem, or null. */
export function firstValidationMessage(problem: ValidationProblem): string | null {
  for (const value of Object.values(problem.errors)) {
    const [first] = messages(value);
    if (first) return first;
  }
  return null;
}

/**
 * Put a 400 ValidationProblemDetails' messages on the matching form controls as a `server` error
 * (cleared by the control's own validators on the next edit).
 *
 * Fields are resolved as a full path first (`Phones[0].Number` → `phones.0.number`), then by their last segment.
 * `aliases` maps API fields that have no control of their own onto one that does.
 * Returns `handled: false` when nothing could be placed on a control, so the caller falls back to a snackbar;
 * `unmapped` lists messages for fields the form doesn't have.
 */
export function applyServerErrors(
  form: FormGroup,
  err: unknown,
  aliases: Record<string, string> = {},
): { handled: boolean; unmapped: string[] } {
  const problem = validationProblem(err);
  if (!problem) return { handled: false, unmapped: [] };

  const unmapped: string[] = [];
  let handled = false;
  for (const [field, value] of Object.entries(problem.errors)) {
    const [message] = messages(value);
    if (!message) continue;
    const path = toControlPath(field);
    const name = toControlName(field);
    const control: AbstractControl | null = form.get(aliases[path] ?? path) ?? form.get(aliases[name] ?? name);
    if (control) {
      control.setErrors({ ...(control.errors ?? {}), server: message });
      control.markAsTouched();
      handled = true;
    } else {
      unmapped.push(message);
    }
  }
  return { handled, unmapped };
}
