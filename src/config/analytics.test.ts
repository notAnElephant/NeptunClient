import { describe, expect, it, vi } from 'vitest';

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock('./posthog', () => ({ posthog: { capture } }));

import { captureFeatureUsed, institutionAnalyticsProperties } from './analytics';

describe('institution analytics', () => {
  it('adds a human-readable university and integration metadata', () => {
    expect(institutionAnalyticsProperties('FI80798')).toMatchObject({
      institution_id: 'FI80798', institution_provider: 'modern', authentication_mode: 'external',
    });
  });

  it('tracks successful provider functions with the university', () => {
    captureFeatureUsed({ institutionId: 'FI80798', provider: 'modern', userName: 'ABC123' }, 'calendar');
    expect(capture).toHaveBeenCalledWith('feature_used', expect.objectContaining({ institution_id: 'FI80798', feature: 'calendar' }));
  });
});
