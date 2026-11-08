import { avatarHue, initials } from './avatar';

describe('initials', () => {
  it('uses the first and last word', () => {
    expect(initials('Ayesha Khan')).toBe('AK');
    expect(initials('Omar bin Abdul Al-Fayed')).toBe('OF');
  });

  it('uses one letter for a single name and ? for nothing', () => {
    expect(initials('ammi')).toBe('A');
    expect(initials('   ')).toBe('?');
    expect(initials(null)).toBe('?');
  });

  it('skips punctuation and keeps letters of any script', () => {
    expect(initials('(Dr.) Hira Siddiqui')).toBe('DS');
    expect(initials('Elif Yılmaz')).toBe('EY');
    expect(initials('علی رضا')).toBe('عر');
  });
});

describe('avatarHue', () => {
  it('is deterministic, case-insensitive and in range', () => {
    const hue = avatarHue('Ayesha Khan');
    expect(avatarHue('ayesha khan ')).toBe(hue);
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
  });

  it('spreads different names across the wheel', () => {
    const hues = new Set(['Ayesha Khan', 'Bilal Khan', 'Fatima Malik', 'Usman Tariq', 'Hira Siddiqui', 'Ahmed Raza'].map(avatarHue));
    expect(hues.size).toBeGreaterThan(4);
  });
});
