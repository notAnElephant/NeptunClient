import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-crypto', () => ({
  randomUUID: () => '12345678-1234-1234-1234-123456789abc',
  digestStringAsync: async () => 'a'.repeat(64),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

import { LoginDiagnosticRecorder, createResponseSchemaSignature, diagnosticUrlMetadata } from './loginDiagnostics';
import type { ResolvedInstitutionAuth } from './universityAuthRegistry';

const resolved: ResolvedInstitutionAuth = {
  institution: { id: 'FI12345', omCode: 'FI12345', name: 'Teszt Egyetem', url: 'https://example.test/MobileService.svc', languages: ['HU'], provider: 'legacy', authenticationMode: 'credentials' },
  strategy: 'legacy-mobile-service',
  status: 'untested',
  revision: 'app-default-v1',
  source: 'default',
};

describe('LoginDiagnosticRecorder', () => {
  const capture = vi.fn();
  const flush = vi.fn(async () => undefined);

  beforeEach(() => { capture.mockClear(); flush.mockClear(); });

  it('buffers ordered steps before consent and flushes them on grant', async () => {
    const recorder = await LoginDiagnosticRecorder.create(resolved, 'unknown', { capture, flush });
    recorder.record({ stage: 'initial-login', operation: 'first' });
    recorder.record({ stage: 'initial-login', operation: 'second' });
    recorder.recordStructuralFailure('initial-login', 'missing-endpoint', 'unsupported-contract', 404);
    expect(capture).not.toHaveBeenCalled();
    expect(recorder.bufferedEventCount).toBe(3);
    recorder.grantConsent();
    expect(capture.mock.calls.map((call) => call[0])).toEqual([
      'university_login_diagnostic_step',
      'university_login_diagnostic_step',
      'university_compatibility_issue',
    ]);
    expect(capture.mock.calls[0][1].step_index).toBe(1);
    expect(capture.mock.calls[1][1].step_index).toBe(2);
    expect(capture.mock.calls[0][1].attempt_id).toBe('a'.repeat(32));
  });

  it('discards buffered events on denial', async () => {
    const recorder = await LoginDiagnosticRecorder.create(resolved, 'unknown', { capture, flush });
    recorder.record({ stage: 'initial-login', operation: 'request' });
    recorder.denyConsent();
    recorder.record({ stage: 'initial-login', operation: 'later' });
    expect(recorder.bufferedEventCount).toBe(0);
    expect(capture).not.toHaveBeenCalled();
  });

  it('caps probe steps and deduplicates identical navigation metadata', async () => {
    const recorder = await LoginDiagnosticRecorder.create(resolved, 'granted', { capture, flush });
    expect(recorder.recordNavigation('https://sso.example.test/login?state=one')).toBe(true);
    expect(recorder.recordNavigation('https://sso.example.test/login?state=two')).toBe(false);
    for (let index = 0; index < 60; index += 1) recorder.record({ stage: 'compatibility-probe', operation: `step-${index}` });
    expect(capture.mock.calls.filter((call) => call[0] === 'university_login_diagnostic_step')).toHaveLength(50);
  });

  it('flushes queued analytics explicitly for close/background handling', async () => {
    const recorder = await LoginDiagnosticRecorder.create(resolved, 'granted', { capture, flush });
    await recorder.flush();
    expect(flush).toHaveBeenCalledOnce();
  });
});

describe('diagnostic metadata', () => {
  it('records URL query keys without values or fragments', () => {
    expect(diagnosticUrlMetadata('https://Example.test/login?state=secret&code=hidden#fragment')).toEqual({ host: 'example.test', path: '/login', query_keys: ['code', 'state'] });
    expect(diagnosticUrlMetadata('https://example.test/callback/12345678-1234-1234-1234-123456789abc')).toMatchObject({ path: '/callback/[redacted]' });
    expect(diagnosticUrlMetadata('http://example.test/login')).toBeNull();
  });

  it('caps sorted schema signatures at depth three and inspects only the first array item', () => {
    const signature = createResponseSchemaSignature({ z: [{ deep: { secret: { ignored: true } }, first: 1 }, { secondOnly: 'never' }], a: true });
    expect(signature).toContain('a:boolean');
    expect(signature).toContain('z:array');
    expect(signature).toContain('z[]:object');
    expect(signature.some((entry) => entry.includes('secondOnly'))).toBe(false);
    expect(signature.length).toBeLessThanOrEqual(40);
  });
});
