import { describe, expect, it } from 'vitest';
import { normalizePersistedInstallationId, opaqueInstallationId } from './analyticsInstallationId';

describe('anonymous installation identifiers', () => {
  it('turns random UUIDs into opaque non-GUID identities', () => {
    expect(opaqueInstallationId('12345678-1234-1234-1234-123456789ABC')).toBe('anon_12345678123412341234123456789abc');
  });

  it('migrates an already persisted UUID while preserving opaque identities', () => {
    expect(normalizePersistedInstallationId('12345678-1234-1234-1234-123456789abc')).toBe('anon_12345678123412341234123456789abc');
    expect(normalizePersistedInstallationId('anon_existing')).toBe('anon_existing');
  });
});
