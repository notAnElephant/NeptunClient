import { describe, expect, it } from 'vitest';
import { redactPostHogProperties, sanitizePostHogEvent } from './posthogPrivacy';

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

  it('drops diagnostic events containing forbidden keys at any depth', () => {
    for (const properties of [
      { nested: { password: 'secret' } },
      { headers: { Accept: 'application/json' } },
      { responseBody: '{}' },
      { authorization: 'Basic abc' },
    ]) {
      expect(sanitizePostHogEvent({ event: 'university_login_diagnostic_step', properties })).toBeNull();
    }
  });

  it('drops diagnostic values containing raw URLs, GUIDs, query values, fragments, bearer tokens, or HTML', () => {
    for (const value of [
      'https://example.test/login?code=secret',
      '12345678-1234-1234-1234-123456789abc',
      '/login?code=secret',
      '/login#secret',
      'Bearer abc.def.ghi',
      'password=secret',
      '<html><form></form></html>',
    ]) {
      expect(sanitizePostHogEvent({ event: 'university_compatibility_issue', properties: { detail: value } })).toBeNull();
    }
  });

  it('keeps sanitized diagnostic metadata and never accepts a Neptun code as distinct_id', () => {
    const diagnostic = sanitizePostHogEvent({
      event: 'university_login_diagnostic_step',
      properties: {
        institution_id: 'FI12345', host: 'example.test', path: '/api', query_keys: ['state'],
        $distinct_id: 'anon_random',
        $session_id: '12345678-1234-1234-1234-123456789abc',
        $current_url: 'https://example.test/private?code=secret',
      },
    });
    expect(diagnostic).not.toBeNull();
    expect(diagnostic?.properties).not.toHaveProperty('$session_id');
    expect(diagnostic?.properties).not.toHaveProperty('$current_url');
    expect(sanitizePostHogEvent({ event: 'login_failed', properties: { $distinct_id: 'ABC123' } })).toBeNull();
  });

  it('strips URL fragments and query values from ordinary analytics', () => {
    const event = sanitizePostHogEvent({ event: 'ordinary_event', properties: { link: 'https://example.test/login?code=secret&state=abc#fragment' } });
    expect(event?.properties.link).toBe('https://example.test/login?code=[REDACTED]&state=[REDACTED]');
  });

  it('drops malformed diagnostic payloads', () => {
    expect(sanitizePostHogEvent({ event: 'university_compatibility_issue', properties: undefined })).toBeNull();
    expect(sanitizePostHogEvent({ event: 'university_compatibility_issue', properties: ['invalid'] } as any)).toBeNull();
    expect(sanitizePostHogEvent({ event: 'university_compatibility_issue', properties: { detail: 'opaque-secret-value' } })).toBeNull();
  });
});
