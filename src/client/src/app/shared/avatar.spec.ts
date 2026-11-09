import { AVATAR_TONES, avatarTone, initials } from './avatar';

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

describe('avatarTone', () => {
  it('is deterministic, case-insensitive and one of the palette tones', () => {
    const tone = avatarTone('Ayesha Khan');
    expect(avatarTone('ayesha khan ')).toBe(tone);
    expect(Number.isInteger(tone)).toBeTrue();
    expect(tone).toBeGreaterThanOrEqual(0);
    expect(tone).toBeLessThan(AVATAR_TONES);
  });

  it('spreads a list of names over the palette', () => {
    const tones = new Set(['Ayesha Khan', 'Bilal Khan', 'Fatima Malik', 'Usman Tariq', 'Hira Siddiqui', 'Ahmed Raza', 'Sana Javed', 'Omar Farooq'].map(avatarTone));
    expect(tones.size).toBeGreaterThanOrEqual(3);
  });

  it('gives an empty name a tone too', () => {
    expect(avatarTone('')).toBe(avatarTone(null));
  });
});
