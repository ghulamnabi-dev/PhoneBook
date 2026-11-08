import { Pipe, PipeTransform } from '@angular/core';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * "just now", "5 minutes ago", "yesterday", "3 days ago", "2 weeks ago"; older than ~a month → "12 Mar 2026".
 * Future timestamps (clock skew) read as "just now".
 */
export function relativeTime(value: string | Date | null | undefined, now: number = Date.now()): string {
  if (value == null || value === '') return '';
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  if (Number.isNaN(time)) return '';
  const diff = now - time;
  if (diff < 45_000) return 'just now';
  if (diff < HOUR) return rtf.format(-Math.max(1, Math.round(diff / MINUTE)), 'minute');
  if (diff < DAY) return rtf.format(-Math.round(diff / HOUR), 'hour');
  if (diff < 7 * DAY) return rtf.format(-Math.round(diff / DAY), 'day');
  if (diff < 30 * DAY) return rtf.format(-Math.round(diff / (7 * DAY)), 'week');
  return dateFmt.format(time);
}

/** Pure: the detail pane re-renders whenever the selected contact changes, which is when the label matters. */
@Pipe({ name: 'relativeTime' })
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return relativeTime(value);
  }
}
