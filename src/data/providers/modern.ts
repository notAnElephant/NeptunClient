import type { NeptunProvider } from '@/domain/provider';
import type { AuthResult, CalendarEvent, CalendarQuery, CaptchaInput, Exam, ExamQuery, ExternalLoginInput, Institution, LoginInput, MessageDetail, MessageQuery, MessageSummary, Page, Session, StudentProfile, Term, Training, TwoFactorInput } from '@/domain/models';
import { checkedJson, ProviderError, safeFetch } from '@/data/errors';
import { asArray, asRecord, booleanValue, stringValue, unwrapData } from './shared';
import { mapModernMessageSummary } from './modernMessages';
import { mapModernCalendarEvent, mapModernExams, mapModernMessageDetail } from './modernContract';
import { recordElteLoginDiagnostic } from '../elteLoginDiagnostics';
import { validateElteServiceUrl } from '../elteExternalAuth';
import { diagnosticJsonRequest, missingRequiredFields } from '../authDiagnosticRequest';
import type { LoginDiagnosticRecorder, LoginDiagnosticStage } from '../loginDiagnostics';

type PendingLogin = { input: LoginInput; captchaIdentifier?: string; captcha?: string; token?: string };
type QueryValue = string | number | boolean | readonly string[] | undefined;

export class ModernNeptunProvider implements NeptunProvider {
  private accessToken?: string;
  private serviceUrl?: string;
  private pending?: PendingLogin;

  constructor(private readonly institution: Institution, private readonly diagnostics?: LoginDiagnosticRecorder) {}

  hydrate(session: Session, accessToken?: string): void { this.accessToken = accessToken; this.serviceUrl = session.serviceUrl; }

  private get baseUrl(): string {
    const url = this.serviceUrl ?? this.institution.url;
    if (!url) throw new ProviderError('unsupported-contract', 'Az intézmény szolgáltatási címe hiányzik.', undefined, 'missing-endpoint');
    return url.replace(/\/$/, '');
  }

  private async request(path: string, query?: Record<string, QueryValue>): Promise<unknown> {
    if (!this.accessToken) throw new ProviderError('authentication', 'A munkamenet lejárt. Jelentkezz be újra.');
    const params = new URLSearchParams();
    Object.entries(query ?? {}).forEach(([key, value]) => {
      if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
      else if (value !== undefined) params.set(key, String(value));
    });
    const response = await safeFetch(`${this.baseUrl}/${path}${params.size ? `?${params}` : ''}`, { headers: { Authorization: `Bearer ${this.accessToken}`, Accept: 'application/json' }, credentials: 'include', redirect: 'manual' });
    return unwrapData(await checkedJson(response));
  }

  private async submitLogin(pending: PendingLogin): Promise<AuthResult> {
    const stage: LoginDiagnosticStage = pending.token ? 'two-factor' : pending.captchaIdentifier ? 'captcha' : 'initial-login';
    const loginUrl = `${this.baseUrl}/Account/Authenticate`;
    const loginPayload = await diagnosticJsonRequest({ recorder: this.diagnostics, stage, operation: 'modern-authenticate', url: loginUrl, method: 'POST', init: {
      method: 'POST', credentials: 'include', redirect: 'manual', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ userName: pending.input.userName.trim().toUpperCase(), password: pending.input.password, subtituteGUID: '', captcha: pending.captcha ?? '', captchaIdentifier: pending.captchaIdentifier ?? '', token: pending.token ?? '', LCID: 1038 }),
    } });
    let data: Record<string, unknown>;
    try { data = asRecord(unwrapData(loginPayload)); }
    catch { throw missingRequiredFields(this.diagnostics, stage, 'modern-authenticate', 'A Neptun bejelentkezési válasza hiányos.'); }
    if (booleanValue(data, 'isCaptchaRequired')) {
      const captchaPayload = await diagnosticJsonRequest({ recorder: this.diagnostics, stage, operation: 'captcha-image', url: `${this.baseUrl}/captcha/image`, method: 'GET', init: { headers: { Accept: 'application/json' }, credentials: 'include', redirect: 'manual' } });
      let captcha: Record<string, unknown>;
      try { captcha = asRecord(unwrapData(captchaPayload)); }
      catch { throw missingRequiredFields(this.diagnostics, stage, 'captcha-image', 'A Neptun CAPTCHA-válasza hiányos.'); }
      const identifier = stringValue(captcha, 'identifier');
      const content = stringValue(captcha, 'content');
      if (!identifier || !content) throw missingRequiredFields(this.diagnostics, stage, 'captcha-image', 'A Neptun CAPTCHA-válasza hiányos.');
      this.pending = { ...pending, captchaIdentifier: identifier };
      return { state: 'captchaRequired', identifier, imageUrl: content.startsWith('data:') ? content : `data:image/png;base64,${content}` };
    }
    if (booleanValue(data, 'isTwoFactorRequired')) { this.pending = pending; return { state: 'twoFactorRequired', challengeId: stringValue(data, 'challengeId') || undefined }; }
    const accessToken = stringValue(data, 'accessToken');
    if (!accessToken) {
      const localMessage = stringValue(data, 'errorMessage', 'message');
      if (localMessage) throw new ProviderError('authentication', localMessage);
      throw missingRequiredFields(this.diagnostics, stage, 'modern-authenticate', 'A Neptun bejelentkezési válaszából hiányzik a hozzáférési állapot.');
    }
    this.accessToken = accessToken;
    this.pending = undefined;
    return { state: 'authenticated', session: { institutionId: this.institution.id, provider: 'modern', userName: pending.input.userName.trim().toUpperCase(), accessToken, expiresAt: stringValue(data, 'refreshTokenExpiration') || undefined } };
  }

  async authenticate(input: LoginInput): Promise<AuthResult> {
    if (this.institution.authenticationMode === 'external') throw new ProviderError('unsupported-contract', 'Az ELTE jelszava csak az ELTE biztonságos bejelentkezési oldalán adható meg.');
    this.pending = { input };
    return this.submitLogin(this.pending);
  }
  async authenticateExternal(input: ExternalLoginInput): Promise<AuthResult> {
    if (this.institution.authenticationMode !== 'external') throw new ProviderError('unsupported-contract', 'Ehhez az intézményhez nem külső bejelentkezés tartozik.');
    const serviceUrl = validateElteServiceUrl(input.serviceUrl);
    if (!serviceUrl) throw new ProviderError('authentication', 'Az ELTE bejelentkezési visszahívási címe érvénytelen.');
    this.serviceUrl = serviceUrl;
    recordElteLoginDiagnostic('exchange_started');
    const exchangePayload = await diagnosticJsonRequest({ recorder: this.diagnostics, stage: 'external-exchange', operation: 'external-token-exchange', url: `${serviceUrl}/Account/OuterLogin`, method: 'POST', init: {
      method: 'POST', credentials: 'include', redirect: 'manual', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ guid: input.guid }),
    } });
    let data: Record<string, unknown>;
    try { data = asRecord(unwrapData(exchangePayload)); }
    catch { throw missingRequiredFields(this.diagnostics, 'external-exchange', 'external-token-exchange', 'A külső Neptun-válasz hiányos.'); }
    const accessToken = stringValue(data, 'accessToken');
    recordElteLoginDiagnostic('exchange_parsed', { hasAccessToken: Boolean(accessToken) });
    if (!accessToken) {
      const localMessage = stringValue(data, 'errorMessage', 'message');
      if (localMessage) throw new ProviderError('authentication', localMessage);
      throw missingRequiredFields(this.diagnostics, 'external-exchange', 'external-token-exchange', 'A külső Neptun-válaszból hiányzik a hozzáférési állapot.');
    }

    const userInfoPayload = await diagnosticJsonRequest({ recorder: this.diagnostics, stage: 'user-info', operation: 'external-user-info', url: `${this.baseUrl}/UserInfo`, method: 'GET', init: {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, credentials: 'include', redirect: 'manual',
    } });
    let userInfo: Record<string, unknown>;
    try { userInfo = asRecord(unwrapData(userInfoPayload)); }
    catch { throw missingRequiredFields(this.diagnostics, 'user-info', 'external-user-info', 'A felhasználói Neptun-válasz hiányos.'); }
    const userName = stringValue(userInfo, 'neptunCode', 'NeptunCode').trim().toUpperCase();
    recordElteLoginDiagnostic('user_info_parsed', { hasUserName: Boolean(userName) });
    if (!userName) throw missingRequiredFields(this.diagnostics, 'user-info', 'external-user-info', 'Az ELTE Neptun-válaszából hiányzik a felhasználói azonosító.');

    this.accessToken = accessToken;
    this.pending = undefined;
    return { state: 'authenticated', session: { institutionId: this.institution.id, provider: 'modern', userName, accessToken, expiresAt: stringValue(data, 'refreshTokenExpiration') || undefined, serviceUrl } };
  }
  async continueCaptcha(input: CaptchaInput): Promise<AuthResult> { if (!this.pending) throw new ProviderError('authentication', 'A CAPTCHA-munkamenet lejárt.'); return this.submitLogin({ ...this.pending, captchaIdentifier: input.identifier, captcha: input.answer }); }
  async continueTwoFactor(input: TwoFactorInput): Promise<AuthResult> { if (!this.pending) throw new ProviderError('authentication', 'A kétlépcsős munkamenet lejárt.'); return this.submitLogin({ ...this.pending, token: input.code }); }

  async refreshSession(session: Session): Promise<Session> {
    const response = await safeFetch(`${this.baseUrl}/Account/GetNewTokens`, { method: 'POST', credentials: 'include', redirect: 'manual', headers: { Authorization: `Bearer ${this.accessToken ?? ''}`, Accept: 'application/json' } });
    const data = asRecord(unwrapData(await checkedJson(response)));
    const accessToken = stringValue(data, 'accessToken');
    if (!accessToken) throw new ProviderError('authentication', 'A munkamenet nem frissíthető.');
    this.accessToken = accessToken;
    return { ...session, accessToken, expiresAt: stringValue(data, 'refreshTokenExpiration') || session.expiresAt };
  }

  async logout(_session: Session): Promise<void> {
    if (this.accessToken) await safeFetch(`${this.baseUrl}/account/logout`, { method: 'POST', credentials: 'include', redirect: 'manual', headers: { Authorization: `Bearer ${this.accessToken}` } }).catch(() => undefined);
    this.accessToken = undefined;
  }

  async getStudentProfile(): Promise<StudentProfile> {
    const data = asRecord(await this.request('UserInfo'));
    const name = stringValue(data, 'name');
    if (!name) throw new ProviderError('malformed-response', 'A hallgató neve hiányzik a Neptun válaszából.');
    return { name };
  }

  async getTrainings(): Promise<Training[]> {
    return asArray(await this.request('MyTrainings')).map((value) => { const row = asRecord(value); return { id: stringValue(row, 'studentTrainingId'), name: stringValue(row, 'trainingName'), code: stringValue(row, 'code'), faculty: stringValue(row, 'faculty') }; });
  }
  async selectTraining(trainingId: string): Promise<void> {
    const response = await safeFetch(`${this.baseUrl}/MyTrainings/${encodeURIComponent(trainingId)}`, {
      method: 'POST', credentials: 'include', redirect: 'manual', headers: { Authorization: `Bearer ${this.accessToken ?? ''}`, Accept: 'application/json' },
    });
    if (!response.ok) await checkedJson(response);
  }
  async getTerms(_trainingId: string): Promise<Term[]> {
    return asArray(await this.request('Advancement/GetStudentTrainingTerms')).map((value) => { const row = asRecord(value); return { id: stringValue(row, 'value'), name: stringValue(row, 'text') }; });
  }
  async getCalendar(query: CalendarQuery): Promise<CalendarEvent[]> {
    return asArray(await this.request('Calendar/GetCalendarEvents', {
      startDate: query.from, endDate: query.to, studentTrainingIds: query.trainingId ? [query.trainingId] : [],
      displayClasses: true, displayExams: true, displayOnlineMeetings: true, displayOtherEvents: true, displayPeriods: true, displayTasks: true,
    })).map(mapModernCalendarEvent);
  }
  async getMessages(query: MessageQuery): Promise<Page<MessageSummary>> {
    const firstRow = query.cursor ? Number(query.cursor) : 0;
    const lastRow = firstRow + query.pageSize;
    const data = asRecord(await this.request('Message/GetReceivedMessages', { firstRow, lastRow, filterType: 0, subjectOrSenderNameFilter: query.search }));
    const values = data.receivedMessages ?? data.messages ?? [];
    const mapped = asArray(values).map(mapModernMessageSummary);
    return { items: mapped.slice(0, query.pageSize), nextCursor: mapped.length > query.pageSize ? String(firstRow + query.pageSize) : undefined };
  }
  async getMessage(messageId: string): Promise<MessageDetail> {
    try { return mapModernMessageDetail(messageId, await this.request(`Messages/${encodeURIComponent(messageId)}/Posts`, { messageId })); }
    catch (error) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError('malformed-response', 'Az üzenet részletei nem értelmezhetők.');
    }
  }
  async getUnreadMessageCount(): Promise<number> { const data = asRecord(await this.request('Message/GetUnreadedMessagesCount')); return Number(data.count ?? 0); }
  async getExams(query: ExamQuery): Promise<Exam[]> {
    const data = await this.request('ExamRegistration/GetExamsList', { 'sortAndPage.firstRow': 0, 'sortAndPage.lastRow': 9999, 'filter.termId': query.termId });
    return mapModernExams(data);
  }
}
