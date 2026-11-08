import { RelativeTimePipe, relativeTime } from './relative-time.pipe';

describe('relativeTime', () => {
  const now = Date.parse('2026-11-08T12:00:00Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();
  const MIN = 60_000;

  it('says "just now" under 45 seconds and for future timestamps', () => {
    expect(relativeTime(ago(10_000), now)).toBe('just now');
    expect(relativeTime(ago(-60 * MIN), now)).toBe('just now');
  });

  it('counts minutes and hours', () => {
    expect(relativeTime(ago(5 * MIN), now)).toBe('5 minutes ago');
    expect(relativeTime(ago(50_000), now)).toBe('1 minute ago');
    expect(relativeTime(ago(3 * 60 * MIN), now)).toBe('3 hours ago');
  });

  it('uses "yesterday" and days within a week', () => {
    expect(relativeTime(ago(24 * 60 * MIN), now)).toBe('yesterday');
    expect(relativeTime(ago(4 * 24 * 60 * MIN), now)).toBe('4 days ago');
  });

  it('uses weeks within a month', () => {
    expect(relativeTime(ago(14 * 24 * 60 * MIN), now)).toBe('2 weeks ago');
  });

  it('shows a date for anything older', () => {
    expect(relativeTime('2026-03-12T09:00:00Z', now)).toBe('12 Mar 2026');
  });

  it('returns an empty string for missing or invalid input', () => {
    expect(relativeTime(null, now)).toBe('');
    expect(relativeTime('not a date', now)).toBe('');
  });

  it('is exposed as the relativeTime pipe', () => {
    expect(new RelativeTimePipe().transform(new Date())).toBe('just now');
  });
});
