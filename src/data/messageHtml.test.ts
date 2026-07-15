import { describe, expect, it } from 'vitest';
import { normalizeMessageLink } from './messageHtml';

describe('message links', () => {
  it('allows web and email links', () => {
    expect(normalizeMessageLink('https://example.com/form')).toBe('https://example.com/form');
    expect(normalizeMessageLink('mailto:registrar@example.com')).toBe('mailto:registrar@example.com');
    expect(normalizeMessageLink('//example.com/form')).toBe('https://example.com/form');
  });

  it('blocks executable and unsupported links', () => {
    expect(normalizeMessageLink('javascript:alert(1)')).toBeNull();
    expect(normalizeMessageLink('data:text/html,unsafe')).toBeNull();
    expect(normalizeMessageLink('/relative/path')).toBeNull();
  });
});
