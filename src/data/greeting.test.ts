import { describe, expect, it } from 'vitest';
import { defaultNickname, greetingFor } from './greeting';

describe('defaultNickname', () => {
  it.each([
    ['A B C', 'B'],
    ['A B', 'B'],
    ['A', 'A'],
    ['  A   B  C ', 'B'],
  ])('uses the first given-name component from %s', (fullName, expected) => {
    expect(defaultNickname(fullName)).toBe(expected);
  });
});

describe('greetingFor', () => {
  it('uses the preferred nickname', () => {
    expect(greetingFor('B')).toBe('Helló, B');
  });
});
