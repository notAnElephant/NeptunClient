import { describe, expect, it, vi } from 'vitest';
import { anonymousIdentityProperties, applyAnonymousAnalyticsIdentity } from './posthogIdentity';

describe('anonymous PostHog identity migration', () => {
  it('replaces a persisted Neptun-code identity with the installation identity once', () => {
    const reset = vi.fn();
    const setPersistedProperty = vi.fn();
    applyAnonymousAnalyticsIdentity({ getDistinctId: () => 'ABC123', reset, setPersistedProperty }, 'installation-random-id');

    expect(reset).toHaveBeenCalledOnce();
    expect(setPersistedProperty.mock.calls).toEqual([
      [anonymousIdentityProperties.distinctId, null],
      [anonymousIdentityProperties.anonymousId, 'installation-random-id'],
      [anonymousIdentityProperties.deviceId, 'installation-random-id'],
      [anonymousIdentityProperties.personMode, 'anonymous'],
    ]);
    expect(setPersistedProperty.mock.calls.flat()).not.toContain('ABC123');
  });

  it('preserves the installation identity after migration and logout-like restarts', () => {
    const reset = vi.fn();
    const setPersistedProperty = vi.fn();
    applyAnonymousAnalyticsIdentity({ getDistinctId: () => 'installation-random-id', reset, setPersistedProperty }, 'installation-random-id');
    expect(reset).not.toHaveBeenCalled();
    expect(setPersistedProperty).not.toHaveBeenCalled();
  });
});
