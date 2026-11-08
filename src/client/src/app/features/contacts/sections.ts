import { ContactSummary } from '../../core/models';

export interface ContactSection {
  /** Stable key for `@for … track`. */
  key: string;
  /** Sticky header text; null for a single unlabelled section. */
  label: string | null;
  items: ContactSummary[];
}

/**
 * Index letter of a contact. The API sorts by last name (people without one last), so the letter is the
 * last name's when there is one, otherwise the first name's. Accents fold ("Ölmez" → O); non-letters → "#".
 */
export function indexLetter(c: Pick<ContactSummary, 'firstName' | 'lastName'>): string {
  const source = (c.lastName?.trim() || c.firstName?.trim() || '').normalize('NFD');
  const ch = source.charAt(0).toLocaleUpperCase();
  return /\p{L}/u.test(ch) ? ch : '#';
}

/** A–Z sections (letters in locale order, "#" last); within a section the API order is kept. */
export function sectionsByLetter(items: readonly ContactSummary[]): ContactSection[] {
  const buckets = new Map<string, ContactSummary[]>();
  for (const c of items) {
    const key = indexLetter(c);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(c);
    else buckets.set(key, [c]);
  }
  return [...buckets.keys()]
    .sort((a, b) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
    .map((key) => ({ key, label: key, items: buckets.get(key)! }));
}

const DAY = 86_400_000;

/** "Today / This week / This month / Earlier" for the Recent sort (input is already newest first). */
export function sectionsByRecency(items: readonly ContactSummary[], now: number = Date.now()): ContactSection[] {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  const label = (iso: string): string => {
    const t = Date.parse(iso);
    if (t >= startOfToday) return 'Today';
    if (t >= startOfToday - 6 * DAY) return 'This week';
    if (t >= startOfToday - 29 * DAY) return 'This month';
    return 'Earlier';
  };
  const sections: ContactSection[] = [];
  for (const c of items) {
    const name = label(c.updatedAt);
    const last = sections[sections.length - 1];
    if (last?.label === name) last.items.push(c);
    else sections.push({ key: name, label: name, items: [c] });
  }
  return sections;
}
