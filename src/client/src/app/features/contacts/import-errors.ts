import { HttpErrorResponse } from '@angular/common/http';
import { validationProblem } from '../../core/problem-details';

export interface ImportFailure {
  /** One-line summary ("The import was cancelled; no contacts were imported."). */
  title: string;
  /** Every problem the server reported, in order — one per invalid card field. */
  messages: string[];
}

const DEFAULT_TITLE = 'The file could not be imported.';

/**
 * The import endpoint is all-or-nothing: a bad card fails the whole upload with a 400
 * ValidationProblemDetails whose messages live under `errors.File` ("Card 3 (Ali): phone number …").
 * Other keys (e.g. a model-binding error on `file`) are listed after them. Returns null for anything that
 * is not a validation failure, so the caller can fall back to a generic error toast.
 */
export function importFailure(err: unknown): ImportFailure | null {
  if (err instanceof HttpErrorResponse && err.status === 413) {
    return { title: DEFAULT_TITLE, messages: ['The file is larger than the server accepts (5 MB).'] };
  }
  const problem = validationProblem(err);
  if (!problem) return null;

  const entries = Object.entries(problem.errors);
  const isFile = (key: string) => key.toLowerCase() === 'file';
  const ordered = [...entries.filter(([k]) => isFile(k)), ...entries.filter(([k]) => !isFile(k))];
  const messages = ordered
    .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
    .filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
    .map((m) => m.trim());

  const title = problem.title?.trim();
  const generic = !title || /one or more (validation errors|fields are invalid)/i.test(title);
  return { title: generic ? DEFAULT_TITLE : title, messages };
}

/** "12 contacts imported; 2 skipped because they had no name or number." */
export function importSummary(imported: number, skipped: number): string {
  const head = imported === 0 ? 'No contacts imported' : `${imported} contact${imported === 1 ? '' : 's'} imported`;
  if (skipped === 0) return head;
  return `${head}; ${skipped} skipped because ${skipped === 1 ? 'it had' : 'they had'} no name or number.`;
}
