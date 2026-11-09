/** Up to two initials: first + last word ("Ayesha Khan" → "AK", "madonna" → "M"). Letters of any script. */
export function initials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/[\s._@-]+/).filter((w) => /\p{L}|\p{N}/u.test(w));
  if (words.length === 0) return '?';
  const first = firstGlyph(words[0]);
  const last = words.length > 1 ? firstGlyph(words[words.length - 1]) : '';
  return (first + last).toLocaleUpperCase();
}

function firstGlyph(word: string): string {
  const match = /[\p{L}\p{N}]/u.exec(word);
  return match ? match[0] : '';
}

/** Number of avatar tones (styles.scss `.avatar[data-tone]`): indigo, violet, blue, teal, slate. */
export const AVATAR_TONES = 5;

/**
 * Stable tone (0 to AVATAR_TONES - 1) for a name, so a person keeps their colour across sessions
 * and devices. The tones are a small set drawn from the indigo accent rather than the whole colour
 * wheel, so a list of contacts reads as one palette. FNV-1a over the case-folded name.
 */
export function avatarTone(name: string | null | undefined): number {
  const key = (name ?? '').trim().toLocaleLowerCase();
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % AVATAR_TONES;
}
