import { indexLetter, sectionsByLetter, sectionsByRecency } from './sections';
import { summary } from './testing';

describe('contact sections', () => {
  it('indexes by last name, falling back to first name', () => {
    expect(indexLetter({ firstName: 'Ayesha', lastName: 'Khan' })).toBe('K');
    expect(indexLetter({ firstName: 'ammi', lastName: null })).toBe('A');
    expect(indexLetter({ firstName: 'Ölmez', lastName: '' })).toBe('O');
    expect(indexLetter({ firstName: '+92 Office', lastName: null })).toBe('#');
  });

  it('groups by letter in alphabetical order with "#" last, keeping API order inside a section', () => {
    const items = [
      summary({ id: 1, firstName: 'Zara', lastName: 'Ahmed' }),
      summary({ id: 2, firstName: 'Hamza', lastName: 'Akhtar' }),
      summary({ id: 3, firstName: 'Bilal', lastName: 'Khan' }),
      summary({ id: 4, firstName: '123 Taxi', lastName: null }),
      summary({ id: 5, firstName: 'Abbu', lastName: null }), // no last name → API puts it last, we file it under A
    ];
    const sections = sectionsByLetter(items);
    expect(sections.map((s) => s.label)).toEqual(['A', 'K', '#']);
    expect(sections[0].items.map((c) => c.id)).toEqual([1, 2, 5]);
  });

  it('buckets the Recent sort into Today / This week / This month / Earlier', () => {
    const now = new Date('2026-11-08T15:00:00').getTime();
    const at = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString();
    const sections = sectionsByRecency(
      [summary({ updatedAt: at(0) }), summary({ updatedAt: at(2) }), summary({ updatedAt: at(3) }), summary({ updatedAt: at(20) }), summary({ updatedAt: at(90) })],
      now,
    );
    expect(sections.map((s) => [s.label, s.items.length])).toEqual([['Today', 1], ['This week', 2], ['This month', 1], ['Earlier', 1]]);
  });

  it('returns no sections for no items', () => {
    expect(sectionsByLetter([])).toEqual([]);
    expect(sectionsByRecency([])).toEqual([]);
  });
});
