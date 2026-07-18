import { describe, expect, it } from 'vitest';
import { canStartNativeCompatibilityProbe, shouldExposeCompatibilityFailure } from './compatibilityExperience';

describe('compatibility experience', () => {
  it('offers diagnostics only for structural failures at unverified institutions', () => {
    expect(shouldExposeCompatibilityFailure(true, 'untested', 'unknown')).toBe(true);
    expect(shouldExposeCompatibilityFailure(true, 'testing', 'granted')).toBe(true);
    expect(shouldExposeCompatibilityFailure(true, 'verified', 'unknown')).toBe(false);
    expect(shouldExposeCompatibilityFailure(false, 'untested', 'unknown')).toBe(false);
    expect(shouldExposeCompatibilityFailure(true, 'untested', 'denied')).toBe(false);
  });

  it('enables a probe only on native after consent with a valid URL', () => {
    expect(canStartNativeCompatibilityProbe('ios', 'granted', 'https://example.test/')).toBe(true);
    expect(canStartNativeCompatibilityProbe('android', 'granted', 'https://example.test/')).toBe(true);
    expect(canStartNativeCompatibilityProbe('web', 'granted', 'https://example.test/')).toBe(false);
    expect(canStartNativeCompatibilityProbe('ios', 'unknown', 'https://example.test/')).toBe(false);
    expect(canStartNativeCompatibilityProbe('ios', 'granted', null)).toBe(false);
  });
});
