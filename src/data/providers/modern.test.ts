import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Institution } from '../../domain/models';
import { ModernNeptunProvider } from './modern';

const institution: Institution = { id: 'FI23344', omCode: 'FI23344', name: 'BME', url: 'https://example.test/api', languages: ['HU'], provider: 'modern', authenticationMode: 'credentials' };
const externalInstitution: Institution = { ...institution, id: 'FI80798', omCode: 'FI80798', name: 'ELTE', authenticationMode: 'external' };
const jsonResponse = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200, headers: { 'Content-Type': 'application/json' } });

function authenticatedProvider() {
  const provider = new ModernNeptunProvider(institution);
  provider.hydrate({ institutionId: institution.id, provider: 'modern', userName: 'ABC123' }, 'access-token');
  return provider;
}

afterEach(() => vi.unstubAllGlobals());

describe('ModernNeptunProvider requests', () => {
  it('loads the student name from UserInfo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ name: 'Minta Elek', neptunCode: 'ABC123' }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(authenticatedProvider().getStudentProfile()).resolves.toEqual({ name: 'Minta Elek' });
    expect(fetchMock.mock.calls[0][0]).toBe('https://example.test/api/UserInfo');
  });

  it('refreshes the bearer token after an authentication timeout', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ accessToken: 'new-token', refreshTokenExpiration: '2026-08-01T00:00:00Z' }));
    vi.stubGlobal('fetch', fetchMock);
    const refreshed = await authenticatedProvider().refreshSession({ institutionId: institution.id, provider: 'modern', userName: 'ABC123', accessToken: 'old-token' });
    expect(fetchMock).toHaveBeenCalledWith('https://example.test/api/Account/GetNewTokens', expect.objectContaining({ method: 'POST' }));
    expect(refreshed).toMatchObject({ accessToken: 'new-token', expiresAt: '2026-08-01T00:00:00Z' });
  });

  it('fetches the CAPTCHA image after authentication requires it', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ isCaptchaRequired: true }))
      .mockResolvedValueOnce(jsonResponse({ identifier: 'captcha-1', content: 'aW1hZ2U=' }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await new ModernNeptunProvider(institution).authenticate({ institution, userName: 'abc123', password: 'secret' });
    expect(fetchMock.mock.calls[1][0]).toBe('https://example.test/api/captcha/image');
    expect(result).toEqual({ state: 'captchaRequired', identifier: 'captcha-1', imageUrl: 'data:image/png;base64,aW1hZ2U=' });
  });

  it('retains the login flow through a two-factor continuation', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ isTwoFactorRequired: true, challengeId: 'challenge-1' }))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'two-factor-token' }));
    vi.stubGlobal('fetch', fetchMock);
    const provider = new ModernNeptunProvider(institution);
    await expect(provider.authenticate({ institution, userName: 'abc123', password: 'secret' })).resolves.toEqual({ state: 'twoFactorRequired', challengeId: 'challenge-1' });
    await expect(provider.continueTwoFactor({ code: '123456' })).resolves.toMatchObject({ state: 'authenticated', session: { accessToken: 'two-factor-token' } });
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ body: expect.stringContaining('123456') });
  });

  it('classifies an otherwise empty login contract as structural', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({})));
    await expect(new ModernNeptunProvider(institution).authenticate({ institution, userName: 'abc123', password: 'secret' }))
      .rejects.toMatchObject({ code: 'malformed-response', structuralReason: 'missing-required-fields' });
  });

  it('keeps a server-provided credential error ordinary and local', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ errorMessage: 'Hibás belépési adatok.' })));
    await expect(new ModernNeptunProvider(institution).authenticate({ institution, userName: 'abc123', password: 'secret' }))
      .rejects.toMatchObject({ code: 'authentication', message: 'Hibás belépési adatok.', structuralReason: undefined });
  });

  it('exchanges an ELTE outer-login GUID and identifies the signed-in account', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'elte-token' }))
      .mockResolvedValueOnce(jsonResponse({ name: 'Minta Elek', neptunCode: 'abc123' }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await new ModernNeptunProvider(externalInstitution).authenticateExternal({ institution: externalInstitution, guid: '12345678-1234-1234-1234-123456789abc', serviceUrl: 'https://hallgato5.neptun.elte.hu/api' });
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://hallgato5.neptun.elte.hu/api/Account/OuterLogin', expect.objectContaining({ method: 'POST', body: JSON.stringify({ guid: '12345678-1234-1234-1234-123456789abc' }) }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://hallgato5.neptun.elte.hu/api/UserInfo', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer elte-token' }) }));
    expect(result).toEqual({ state: 'authenticated', session: { institutionId: 'FI80798', provider: 'modern', userName: 'ABC123', accessToken: 'elte-token', serviceUrl: 'https://hallgato5.neptun.elte.hu/api' } });
  });

  it('never submits ELTE credentials to the direct authentication endpoint', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const provider = new ModernNeptunProvider(externalInstitution);
    await expect(provider.authenticate({ institution: externalInstitution, userName: 'ABC123', password: 'secret' })).rejects.toMatchObject({ code: 'unsupported-contract' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('switches the server-side training context', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    await authenticatedProvider().selectTraining('training/1');
    expect(fetchMock).toHaveBeenCalledWith('https://example.test/api/MyTrainings/training%2F1', expect.objectContaining({ method: 'POST' }));
  });

  it('serializes the current calendar filter contract', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);
    await authenticatedProvider().getCalendar({ from: '2026-07-01T00:00:00.000Z', to: '2026-07-31T23:59:59.999Z', trainingId: 'training-1' });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get('startDate')).toBe('2026-07-01T00:00:00.000Z');
    expect(url.searchParams.getAll('studentTrainingIds')).toEqual(['training-1']);
    for (const key of ['displayClasses', 'displayExams', 'displayOnlineMeetings', 'displayOtherEvents', 'displayPeriods', 'displayTasks']) expect(url.searchParams.get(key)).toBe('true');
    expect(url.searchParams.has('request.startDate')).toBe(false);
  });

  it('uses message search fields and one sentinel row', async () => {
    const row = (id: string) => ({ messageId: id, subject: id, senderName: 'Sender', lastPostDate: '2026-07-13T10:00:00Z', unreadedPostCount: 0 });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ receivedMessages: [row('1'), row('2')] }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await authenticatedProvider().getMessages({ pageSize: 1, search: 'needle' });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get('subjectOrSenderNameFilter')).toBe('needle');
    expect(url.searchParams.get('filterType')).toBe('0');
    expect(url.searchParams.get('lastRow')).toBe('1');
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe('1');
  });

  it('requests message details with the redundant messageId parameter', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      messageData: { subject: 'Subject' }, recipients: [{ userId: 'u1', printName: 'Sender' }],
      posts: [{ senderUserId: 'u1', sendDate: '2026-07-13T10:00:00Z', htmlText: 'Body', isRead: true }],
    }));
    vi.stubGlobal('fetch', fetchMock);
    await authenticatedProvider().getMessage('message/1');
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname.endsWith('/Messages/message%2F1/Posts')).toBe(true);
    expect(url.searchParams.get('messageId')).toBe('message/1');
  });

  it('uses sortAndPage exam pagination and flattens the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ subjectName: 'Algorithms', examList: [{ examId: 'e1', fromDate: '2026-07-20T08:00:00Z' }] }]));
    vi.stubGlobal('fetch', fetchMock);
    const result = await authenticatedProvider().getExams({ termId: 'term-1', trainingId: 'ignored' });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get('sortAndPage.firstRow')).toBe('0');
    expect(url.searchParams.get('sortAndPage.lastRow')).toBe('9999');
    expect(url.searchParams.has('filter.studentTrainingId')).toBe(false);
    expect(result[0]).toMatchObject({ id: 'e1', subject: 'Algorithms', startsAt: '2026-07-20T08:00:00.000Z' });
  });
});
