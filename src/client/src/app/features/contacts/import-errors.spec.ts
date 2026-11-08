import { HttpErrorResponse } from '@angular/common/http';
import { importFailure, importSummary } from './import-errors';

const bad = (body: unknown, status = 400) => new HttpErrorResponse({ status, error: body });

describe('import error mapping', () => {
  it('lists every message under errors.File with the server title', () => {
    const failure = importFailure(
      bad({
        title: 'The import was cancelled; no contacts were imported.',
        errors: { File: ['Card 2 (Nida): phone number "1234" must be 5–25 characters.', 'Card 5: a name is required.'] },
      }),
    );
    expect(failure).toEqual({
      title: 'The import was cancelled; no contacts were imported.',
      messages: ['Card 2 (Nida): phone number "1234" must be 5–25 characters.', 'Card 5: a name is required.'],
    });
  });

  it('puts File messages first, then any other field, and ignores blanks', () => {
    const failure = importFailure(bad({ title: 'One or more validation errors occurred.', errors: { other: ['Odd.'], file: ['Choose a .vcf file to import.', ' '] } }));
    expect(failure?.messages).toEqual(['Choose a .vcf file to import.', 'Odd.']);
  });

  it('replaces the generic ASP.NET title with a friendlier one', () => {
    expect(importFailure(bad({ title: 'One or more fields are invalid.', errors: { File: ['x'] } }))?.title).toBe('The file could not be imported.');
  });

  it('explains a 413 from the size limit', () => {
    expect(importFailure(bad(null, 413))?.messages[0]).toContain('5 MB');
  });

  it('returns null for errors that are not validation failures', () => {
    expect(importFailure(bad({ title: 'Server error' }, 500))).toBeNull();
    expect(importFailure(bad({ title: 'Bad request' }))).toBeNull();
    expect(importFailure(new Error('boom'))).toBeNull();
  });

  it('summarises a successful import', () => {
    expect(importSummary(12, 0)).toBe('12 contacts imported');
    expect(importSummary(1, 2)).toBe('1 contact imported · 2 skipped (no name or number)');
    expect(importSummary(0, 3)).toBe('No contacts imported · 3 skipped (no name or number)');
  });
});
