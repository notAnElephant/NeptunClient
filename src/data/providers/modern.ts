import type { NeptunProvider } from '@/domain/provider';
import type { AuthResult, CalendarEvent, CalendarQuery, CaptchaInput, Exam, ExamQuery, Institution, LoginInput, MessageDetail, MessageQuery, MessageSummary, Page, Session, Term, Training, TwoFactorInput } from '@/domain/models';
import { parseNeptunDate } from '@/data/date';
import { checkedJson, ProviderError, safeFetch } from '@/data/errors';
import { asArray, asRecord, booleanValue, stringValue, unwrapData } from './shared';

type PendingLogin = { input: LoginInput; captchaIdentifier?: string; captcha?: string; token?: string };

export class ModernNeptunProvider implements NeptunProvider {
  private accessToken?: string;
  private pending?: PendingLogin;

  constructor(private readonly institution: Institution) {}

  hydrate(_session: Session, accessToken?: string): void { this.accessToken = accessToken; }

  private get baseUrl(): string {
    if (!this.institution.url) throw new ProviderError('unsupported-contract', 'Az intézmény szolgáltatási címe hiányzik.');
    return this.institution.url.replace(/\/$/, '');
  }

  private async request(path: string, query?: Record<string, string | number | undefined>): Promise<unknown> {
    if (!this.accessToken) throw new ProviderError('authentication', 'A munkamenet lejárt. Jelentkezz be újra.');
    const params = new URLSearchParams();
    Object.entries(query ?? {}).forEach(([key, value]) => { if (value !== undefined) params.set(key, String(value)); });
    const response = await safeFetch(`${this.baseUrl}/${path}${params.size ? `?${params}` : ''}`, { headers: { Authorization: `Bearer ${this.accessToken}`, Accept: 'application/json' }, credentials: 'include' });
    return unwrapData(await checkedJson(response));
  }

  private async submitLogin(pending: PendingLogin): Promise<AuthResult> {
    const response = await safeFetch(`${this.baseUrl}/Account/Authenticate`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ userName: pending.input.userName.trim().toUpperCase(), password: pending.input.password, subtituteGUID: '', captcha: pending.captcha ?? '', captchaIdentifier: pending.captchaIdentifier ?? '', token: pending.token ?? '', LCID: 1038 }),
    });
    const data = asRecord(unwrapData(await checkedJson(response)));
    if (booleanValue(data, 'isCaptchaRequired')) {
      const identifier = stringValue(data, 'captchaIdentifier');
      this.pending = { ...pending, captchaIdentifier: identifier };
      return { state: 'captchaRequired', identifier, imageUrl: stringValue(data, 'captchaImageUrl', 'captchaUrl') || undefined };
    }
    if (booleanValue(data, 'isTwoFactorRequired')) { this.pending = pending; return { state: 'twoFactorRequired', challengeId: stringValue(data, 'challengeId') || undefined }; }
    const accessToken = stringValue(data, 'accessToken');
    if (!accessToken) throw new ProviderError('authentication', stringValue(data, 'errorMessage', 'message') || 'Sikertelen bejelentkezés.');
    this.accessToken = accessToken;
    this.pending = undefined;
    return { state: 'authenticated', session: { institutionId: this.institution.id, provider: 'modern', userName: pending.input.userName.trim().toUpperCase(), accessToken, expiresAt: stringValue(data, 'refreshTokenExpiration') || undefined } };
  }

  async authenticate(input: LoginInput): Promise<AuthResult> { this.pending = { input }; return this.submitLogin(this.pending); }
  async continueCaptcha(input: CaptchaInput): Promise<AuthResult> { if (!this.pending) throw new ProviderError('authentication', 'A CAPTCHA-munkamenet lejárt.'); return this.submitLogin({ ...this.pending, captchaIdentifier: input.identifier, captcha: input.answer }); }
  async continueTwoFactor(input: TwoFactorInput): Promise<AuthResult> { if (!this.pending) throw new ProviderError('authentication', 'A kétlépcsős munkamenet lejárt.'); return this.submitLogin({ ...this.pending, token: input.code }); }

  async refreshSession(session: Session): Promise<Session> {
    const response = await safeFetch(`${this.baseUrl}/Account/GetNewTokens`, { method: 'POST', credentials: 'include', headers: { Authorization: `Bearer ${this.accessToken ?? ''}`, Accept: 'application/json' } });
    const data = asRecord(unwrapData(await checkedJson(response)));
    const accessToken = stringValue(data, 'accessToken');
    if (!accessToken) throw new ProviderError('authentication', 'A munkamenet nem frissíthető.');
    this.accessToken = accessToken;
    return { ...session, accessToken, expiresAt: stringValue(data, 'refreshTokenExpiration') || session.expiresAt };
  }

  async logout(_session: Session): Promise<void> {
    if (this.accessToken) await safeFetch(`${this.baseUrl}/account/logout`, { method: 'POST', credentials: 'include', headers: { Authorization: `Bearer ${this.accessToken}` } }).catch(() => undefined);
    this.accessToken = undefined;
  }

  async getTrainings(): Promise<Training[]> {
    return asArray(await this.request('MyTrainings')).map((value) => { const row = asRecord(value); return { id: stringValue(row, 'studentTrainingId'), name: stringValue(row, 'trainingName'), code: stringValue(row, 'code'), faculty: stringValue(row, 'faculty'), isActive: booleanValue(row, 'isActual', 'isActive') }; });
  }
  async getTerms(_trainingId: string): Promise<Term[]> {
    return asArray(await this.request('Advancement/GetStudentTrainingTerms')).map((value) => { const row = asRecord(value); return { id: stringValue(row, 'value'), name: stringValue(row, 'text') }; });
  }
  async getCalendar(query: CalendarQuery): Promise<CalendarEvent[]> {
    return asArray(await this.request('Calendar/GetCalendarEvents', { 'request.startDate': query.from, 'request.endDate': query.to, 'request.studentTrainingId': query.trainingId })).map((value) => { const row = asRecord(value); const rawType = stringValue(row, 'calendarEventType', 'type').toLowerCase(); return { id: stringValue(row, 'id', 'calendarEventId'), title: stringValue(row, 'name', 'title'), startsAt: parseNeptunDate(row.startDate ?? row.start), endsAt: parseNeptunDate(row.endDate ?? row.end), location: stringValue(row, 'location', 'roomName'), description: stringValue(row, 'description'), type: rawType.includes('exam') ? 'exam' : rawType.includes('task') ? 'task' : rawType.includes('course') ? 'course' : 'other' }; });
  }
  async getMessages(query: MessageQuery): Promise<Page<MessageSummary>> {
    const firstRow = query.cursor ? Number(query.cursor) : 0;
    const lastRow = firstRow + query.pageSize - 1;
    const data = asRecord(await this.request('Message/GetReceivedMessages', { firstRow, lastRow, filter: query.search }));
    const values = data.receivedMessages ?? data.messages ?? [];
    const items = asArray(values).map((value) => { const row = asRecord(value); return { id: stringValue(row, 'messageId', 'id'), subject: stringValue(row, 'subject'), sender: stringValue(row, 'senderName', 'fromName', 'name'), sentAt: parseNeptunDate(row.sendDate ?? row.sentAt), preview: stringValue(row, 'preview', 'shortText'), isUnread: booleanValue(row, 'isUnread', 'isNew') }; });
    return { items, nextCursor: items.length === query.pageSize ? String(lastRow + 1) : undefined };
  }
  async getMessage(messageId: string): Promise<MessageDetail> {
    const posts = asArray(await this.request(`Messages/${encodeURIComponent(messageId)}/Posts`));
    if (!posts.length) throw new ProviderError('unsupported-contract', 'Az üzenet nem található.');
    const first = asRecord(posts[0]);
    const last = asRecord(posts[posts.length - 1]);
    return { id: messageId, subject: stringValue(first, 'subject', 'messageSubject'), sender: stringValue(first, 'senderName', 'name'), sentAt: parseNeptunDate(first.sendDate ?? first.createdAt), preview: stringValue(first, 'shortText'), isUnread: booleanValue(first, 'isUnread'), body: stringValue(last, 'body', 'text', 'content').replace(/<[^>]+>/g, ' ').trim() };
  }
  async getUnreadMessageCount(): Promise<number> { const data = asRecord(await this.request('Message/GetUnreadedMessagesCount')); return Number(data.count ?? 0); }
  async getExams(query: ExamQuery): Promise<Exam[]> {
    const data = await this.request('ExamRegistration/GetExamsList', { firstRow: 0, lastRow: 99, 'filter.termId': query.termId, 'filter.studentTrainingId': query.trainingId });
    const rows = Array.isArray(data) ? data : asArray(asRecord(data).exams ?? asRecord(data).examEntries ?? []);
    return rows.map((value) => { const row = asRecord(value); return { id: stringValue(row, 'examId', 'id'), subject: stringValue(row, 'subjectName', 'name'), startsAt: parseNeptunDate(row.startDate ?? row.examDate), location: stringValue(row, 'location', 'roomName'), result: stringValue(row, 'result'), status: stringValue(row, 'examType', 'status') }; });
  }
}
