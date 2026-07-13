import { describe, expect, it } from 'vitest';
import { parseNeptunDate, toLegacyDate } from './date';

describe('Neptun date normalization', () => {
  it('normalizes legacy millisecond dates', () => expect(parseNeptunDate('/Date(1676912670000)/')).toBe('2023-02-20T17:04:30.000Z'));
  it('normalizes legacy second dates', () => expect(parseNeptunDate('/Date(1676912670)/')).toBe('2023-02-20T17:04:30.000Z'));
  it('serializes ISO values for legacy calls', () => expect(toLegacyDate('2023-02-20T17:04:30.000Z')).toBe('/Date(1676912670000)/'));
  it('rejects malformed values', () => expect(() => parseNeptunDate('not-a-date')).toThrow());
});
