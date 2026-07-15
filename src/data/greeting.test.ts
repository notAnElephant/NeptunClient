import { describe, expect, it } from 'vitest';
import { greetingFor } from './greeting';

describe('greetingFor', () => {
  it.each([
    [new Date(2026, 6, 15, 9), 'Jó reggelt, Minta Elek!'],
    [new Date(2026, 6, 15, 10), 'Jó napot, Minta Elek!'],
    [new Date(2026, 6, 15, 18), 'Jó estét, Minta Elek!'],
  ])('uses the local time of day', (date, expected) => {
    expect(greetingFor(date, 'Minta Elek')).toBe(expected);
  });
});
