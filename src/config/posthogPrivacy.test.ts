import { describe, expect, it } from 'vitest';
import { redactPostHogProperties } from './posthogPrivacy';

describe('PostHog privacy filtering', () => {
  it('redacts authentication fields recursively', () => {
    expect(redactPostHogProperties({ password: 'secret', nested: { accessToken: 'token', safe: 'calendar' } })).toEqual({
      password: '[REDACTED]', nested: { accessToken: '[REDACTED]', safe: 'calendar' },
    });
  });

  it('redacts credentials embedded in exception messages', () => {
    const properties = redactPostHogProperties({
      message: 'GET https://example.test?GUID=12345678-1234-1234-1234-123456789abc Authorization: Bearer abc.def',
    });
    expect(properties.message).not.toContain('12345678-1234-1234-1234-123456789abc');
    expect(properties.message).not.toContain('abc.def');
  });
});
