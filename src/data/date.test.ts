import { describe, expect, it } from 'vitest';
import { calendarGridRange, dateFromKey, localDateKey, parseNeptunDate, toLegacyDate } from './date';

describe('Neptun date normalization', () => {
  it('normalizes legacy millisecond dates', () => expect(parseNeptunDate('/Date(1676912670000)/')).toBe('2023-02-20T17:04:30.000Z'));
  it('normalizes legacy second dates', () => expect(parseNeptunDate('/Date(1676912670)/')).toBe('2023-02-20T17:04:30.000Z'));
  it('serializes ISO values for legacy calls', () => expect(toLegacyDate('2023-02-20T17:04:30.000Z')).toBe('/Date(1676912670000)/'));
  it('rejects malformed values', () => expect(() => parseNeptunDate('not-a-date')).toThrow());
});

describe('calendar date helpers', () => {
  it('round-trips local calendar dates without a UTC shift', () => {
    const date = dateFromKey('2026-07-05');
    expect(localDateKey(date)).toBe('2026-07-05');
  });

  it('returns the six Monday-to-Sunday weeks containing a month', () => {
    const range = calendarGridRange(new Date(2026, 6, 15));
    const from = new Date(range.from);
    const to = new Date(range.to);
    expect(localDateKey(from)).toBe('2026-06-29');
    expect(localDateKey(to)).toBe('2026-08-09');
    expect(from.getDay()).toBe(1);
    expect(to.getDay()).toBe(0);
  });
});
