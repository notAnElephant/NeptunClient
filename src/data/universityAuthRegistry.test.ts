import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Institution } from '@/domain/models';
import {
  clearUniversityAuthRegistryForTests,
  configureUniversityAuthRegistryClient,
  deriveSameOriginModernApiUrl,
  installUniversityAuthRegistry,
  parseUniversityAuthRegistry,
  refreshUniversityAuthRegistry,
  resolveInstitutionAuth,
} from './universityAuthRegistry';

const institution: Institution = {
  id: 'FI12345',
  omCode: 'FI12345',
  name: 'Teszt Egyetem',
  url: 'https://neptun.example.test/hallgato/MobileService.svc',
  languages: ['HU'],
  provider: 'legacy',
  authenticationMode: 'credentials',
};

const payload = (strategy: 'legacy-mobile-service' | 'modern-credentials' | 'compiled-external' = 'modern-credentials') => ({
  schemaVersion: 1 as const,
  revision: '2026-07-17.1',
  institutions: { FI12345: { strategy, status: 'testing' as const } },
});

describe('university authentication registry', () => {
  beforeEach(clearUniversityAuthRegistryForTests);

  it('strictly rejects executable or remotely supplied configuration', () => {
    expect(parseUniversityAuthRegistry({ ...payload(), institutions: { FI12345: { ...payload().institutions.FI12345, url: 'https://evil.test' } } })).toBeNull();
    expect(parseUniversityAuthRegistry({ ...payload(), javascript: 'alert(1)' })).toBeNull();
  });

  it('keeps hardcoded verified configuration ahead of a remote assignment', () => {
    installUniversityAuthRegistry({ ...payload('legacy-mobile-service'), institutions: { FI23344: { strategy: 'legacy-mobile-service', status: 'testing' } } });
    const bme = resolveInstitutionAuth({ ...institution, id: 'FI23344', omCode: 'FI23344', provider: 'modern', url: 'https://neptun.bme.hu/hallgatoi/api' });
    expect(bme).toMatchObject({ strategy: 'modern-credentials', status: 'verified', source: 'hardcoded' });
  });

  it('derives modern /api only from the same HTTPS MobileService origin', () => {
    expect(deriveSameOriginModernApiUrl(institution.url)).toBe('https://neptun.example.test/hallgato/api');
    expect(deriveSameOriginModernApiUrl('http://neptun.example.test/MobileService.svc')).toBeNull();
    expect(deriveSameOriginModernApiUrl('https://neptun.example.test/api')).toBeNull();
    installUniversityAuthRegistry(payload());
    expect(resolveInstitutionAuth(institution)).toMatchObject({
      strategy: 'modern-credentials',
      status: 'testing',
      source: 'remote',
      institution: { url: 'https://neptun.example.test/hallgato/api', provider: 'modern' },
    });
  });

  it('rejects an external strategy that is not compiled for the institution', () => {
    const capture = vi.fn();
    configureUniversityAuthRegistryClient({ capture, getFeatureFlagResult: () => undefined, reloadFeatureFlagsAsync: async () => undefined });
    installUniversityAuthRegistry(payload('compiled-external'));
    expect(resolveInstitutionAuth(institution)).toMatchObject({ strategy: 'legacy-mobile-service', status: 'untested', source: 'default' });
    expect(capture).toHaveBeenCalledWith('compatibility_config_rejected', { reason: 'external_not_allowlisted', institution_id: 'FI12345' });
  });

  it('loads cached payloads and keeps them when an anonymous refresh is offline', async () => {
    const reloadFeatureFlagsAsync = vi.fn().mockRejectedValue(new Error('offline'));
    configureUniversityAuthRegistryClient({
      capture: vi.fn(),
      getFeatureFlagResult: () => ({ payload: payload() }),
      reloadFeatureFlagsAsync,
    });
    await refreshUniversityAuthRegistry();
    expect(reloadFeatureFlagsAsync).toHaveBeenCalledOnce();
    expect(resolveInstitutionAuth(institution).strategy).toBe('modern-credentials');
  });

  it('falls back to the compiled default when a successful refresh removes the assignment', async () => {
    let currentPayload: unknown = payload();
    configureUniversityAuthRegistryClient({
      capture: vi.fn(),
      getFeatureFlagResult: () => currentPayload === undefined ? undefined : { payload: currentPayload },
      reloadFeatureFlagsAsync: async () => {
        currentPayload = undefined;
        return { 'university-auth-strategies': false };
      },
    });
    await refreshUniversityAuthRegistry();
    expect(resolveInstitutionAuth(institution)).toMatchObject({ strategy: 'legacy-mobile-service', source: 'default' });
  });
});
