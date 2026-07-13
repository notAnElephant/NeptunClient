import { describe, expect, it } from 'vitest';
import { institutions } from './institutions';

describe('institution configuration', () => {
  it('gives every documented institution the same normalized shape', () => {
    expect(institutions.length).toBeGreaterThan(20);
    for (const item of institutions) expect(Object.keys(item).sort()).toEqual(['id', 'languages', 'name', 'omCode', 'provider', 'url']);
  });
  it('selects the modern adapter only for the documented BME deployment', () => {
    expect(institutions.find((item) => item.omCode === 'FI23344')?.provider).toBe('modern');
    expect(institutions.filter((item) => item.provider === 'modern')).toHaveLength(1);
  });
  it('does not attach user-facing support tiers', () => {
    for (const item of institutions) expect(item).not.toHaveProperty('verified');
  });
});
