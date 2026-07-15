import { describe, expect, it } from 'vitest';
import { institutions } from './institutions';

describe('institution configuration', () => {
  it('gives every documented institution the same normalized shape', () => {
    expect(institutions.length).toBeGreaterThan(20);
    for (const item of institutions) expect(Object.keys(item).sort()).toEqual(['authenticationMode', 'id', 'languages', 'name', 'omCode', 'provider', 'url']);
  });
  it('selects the modern adapter for BME and ELTE with the correct authentication modes', () => {
    expect(institutions.find((item) => item.omCode === 'FI23344')?.provider).toBe('modern');
    expect(institutions.find((item) => item.omCode === 'FI23344')?.authenticationMode).toBe('credentials');
    expect(institutions.find((item) => item.omCode === 'FI80798')).toMatchObject({ provider: 'modern', authenticationMode: 'external', url: 'https://hallgato2.neptun.elte.hu/api' });
    expect(institutions.filter((item) => item.provider === 'modern')).toHaveLength(2);
  });
  it('does not attach user-facing support tiers', () => {
    for (const item of institutions) expect(item).not.toHaveProperty('verified');
  });
});
