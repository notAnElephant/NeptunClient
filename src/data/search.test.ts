import { describe, expect, it } from 'vitest';
import { matchesSearch, normalizeSearchText } from './search';

describe('accent-insensitive search', () => {
  it('matches without requiring accents', () => {
    expect(matchesSearch('Eötvös Loránd Tudományegyetem', 'Eotvos Lorand')).toBe(true);
    expect(matchesSearch('Budapesti Műszaki Egyetem', 'muszaki')).toBe(true);
  });

  it('also matches an accented query against unaccented text', () => {
    expect(matchesSearch('Kor', 'kör')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(matchesSearch('EÖTVÖS LORÁND', 'eotvos')).toBe(true);
  });

  it('normalizes composed and decomposed Unicode spellings', () => {
    expect(normalizeSearchText('Eo\u0308tvo\u0308s')).toBe('eotvos');
  });

  it('ignores surrounding whitespace in the query', () => {
    expect(matchesSearch('Budapesti Műszaki Egyetem', '  muszaki  ')).toBe(true);
  });
});
