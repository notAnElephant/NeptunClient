import { afterEach, describe, expect, it, vi } from 'vitest';
import { diagnosticJsonRequest } from './authDiagnosticRequest';
import { ProviderError } from './errors';

const record = vi.fn();
const recorder = { record } as any;

function response(status: number, body: string, contentType = 'application/json', extra: ResponseInit = {}): Response {
  return new Response(body, { status, headers: { 'content-type': contentType }, ...extra });
}

async function request(): Promise<unknown> {
  return diagnosticJsonRequest({
    recorder,
    stage: 'initial-login',
    operation: 'test-login',
    url: 'https://neptun.example.test/api/login?state=never-record-this',
    method: 'POST',
  });
}

describe('diagnostic JSON request classification', () => {
  afterEach(() => { vi.unstubAllGlobals(); record.mockClear(); });

  it('keeps wrong credentials ordinary', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(401, '{}')));
    await expect(request()).rejects.toMatchObject({ code: 'authentication', status: 401, structuralReason: undefined });
  });

  it.each([
    [404, 'missing-endpoint'],
    [405, 'unsupported-status'],
    [415, 'unsupported-status'],
  ])('classifies HTTP %s as a structural failure', async (status, reason) => {
    vi.stubGlobal('fetch', vi.fn(async () => response(status, '{}')));
    await expect(request()).rejects.toMatchObject({ structuralReason: reason, diagnosticStage: 'initial-login' });
  });

  it('classifies a login redirect as structural and records only redirect metadata', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 302, headers: { location: 'https://sso.example.test/login?state=secret' } })));
    await expect(request()).rejects.toMatchObject({ structuralReason: 'login-redirect' });
    const serialized = JSON.stringify(record.mock.calls);
    expect(serialized).toContain('sso.example.test');
    expect(serialized).toContain('redirect_query_keys');
    expect(serialized).not.toContain('secret');
  });

  it('classifies HTML and malformed JSON as structural without recording content', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(200, '<html>private</html>', 'text/html')));
    await expect(request()).rejects.toMatchObject({ structuralReason: 'html-response' });
    expect(JSON.stringify(record.mock.calls)).not.toContain('private');

    record.mockClear();
    vi.stubGlobal('fetch', vi.fn(async () => response(200, 'not-json')));
    await expect(request()).rejects.toMatchObject({ structuralReason: 'malformed-json' });
    expect(JSON.stringify(record.mock.calls)).not.toContain('not-json');
  });

  it('keeps 5xx and connectivity failures ordinary', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(503, '{}')));
    await expect(request()).rejects.toMatchObject({ code: 'server', structuralReason: undefined });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    await expect(request()).rejects.toMatchObject({ code: 'connectivity', structuralReason: undefined });
  });

  it('records schema shape and URL query keys but never values', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(200, JSON.stringify({ accessToken: 'super-secret', nested: [{ id: 42 }] }))));
    await expect(request()).resolves.toEqual({ accessToken: 'super-secret', nested: [{ id: 42 }] });
    const serialized = JSON.stringify(record.mock.calls);
    expect(serialized).toContain('[redacted]:string');
    expect(serialized).not.toContain('accessToken');
    expect(serialized).toContain('query_keys');
    expect(serialized).not.toContain('super-secret');
    expect(serialized).not.toContain('never-record-this');
  });

  it('returns ProviderError instances for normalization', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(404, '{}')));
    await request().catch((error) => expect(error).toBeInstanceOf(ProviderError));
  });
});
