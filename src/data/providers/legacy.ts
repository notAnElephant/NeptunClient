import type { NeptunProvider } from '@/domain/provider';
import type { AuthResult, CalendarEvent, CalendarQuery, CaptchaInput, Exam, ExamQuery, ExternalLoginInput, Institution, LoginInput, MessageDetail, MessageQuery, MessageSummary, Page, Session, StudentProfile, Term, Training, TwoFactorInput } from '@/domain/models';
import { checkedJson, ProviderError, safeFetch } from '@/data/errors';
import { parseNeptunDate, toLegacyDate } from '@/data/date';
import { matchesSearch } from '@/data/search';
import { asArray, asRecord, booleanValue, stringValue } from './shared';
import { diagnosticJsonRequest, missingRequiredFields } from '../authDiagnosticRequest';
import type { LoginDiagnosticRecorder, LoginDiagnosticStage } from '../loginDiagnostics';

interface LegacyCredentials { userName: string; password: string }

export class LegacyMobileProvider implements NeptunProvider {
  private credentials?: LegacyCredentials;
  private session?: Session;

  constructor(private readonly institution: Institution, private readonly diagnostics?: LoginDiagnosticRecorder) {}

  hydrate(session: Session, password?: string): void {
    this.session = session;
    if (password) this.credentials = { userName: session.userName, password };
  }

  private async call(operation: string, extra: Record<string, unknown> = {}, diagnosticStage?: LoginDiagnosticStage): Promise<Record<string, unknown>> {
    if (!this.institution.url) {
      if (diagnosticStage) this.diagnostics?.record({ stage: diagnosticStage, operation, method: 'POST', error_code: 'unsupported-contract', reason: 'missing-endpoint' });
      throw new ProviderError('unsupported-contract', 'Ehhez az intézményhez nincs dokumentált Neptun szolgáltatási cím.', undefined, diagnosticStage ? 'missing-endpoint' : undefined, diagnosticStage);
    }
    if (!this.credentials) throw new ProviderError('authentication', 'A munkamenet lejárt. Jelentkezz be újra.');
    const url = `${this.institution.url.replace(/\/$/, '')}/${operation}`;
    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ UserLogin: this.credentials.userName, Password: this.credentials.password, CurrentPage: 0, LCID: 1038, ...extra }),
    };
    const payload = diagnosticStage
      ? await diagnosticJsonRequest({ recorder: this.diagnostics, stage: diagnosticStage, operation, url, method: 'POST', init })
      : await checkedJson(await safeFetch(url, init));
    let result: Record<string, unknown>;
    try { result = asRecord(payload); }
    catch {
      if (diagnosticStage) throw missingRequiredFields(this.diagnostics, diagnosticStage, operation, 'A Neptun bejelentkezési válasza hiányos.');
      throw new ProviderError('malformed-response', 'A Neptun válasza nem értelmezhető.');
    }
    if (result.ErrorMessage) throw new ProviderError('server', String(result.ErrorMessage));
    return result;
  }

  async authenticate(input: LoginInput): Promise<AuthResult> {
    this.credentials = { userName: input.userName.trim().toUpperCase(), password: input.password };
    const result = await this.call('GetTrainings', {}, 'initial-login');
    if (!Array.isArray(result.TrainingList)) {
      throw missingRequiredFields(this.diagnostics, 'initial-login', 'GetTrainings', 'A Neptun bejelentkezési válaszából hiányzik a képzési lista.');
    }
    this.session = { institutionId: this.institution.id, provider: 'legacy', userName: this.credentials.userName };
    return { state: 'authenticated', session: this.session };
  }

  async authenticateExternal(_input: ExternalLoginInput): Promise<AuthResult> { throw new ProviderError('unsupported-contract', 'Ehhez az intézményhez nem tartozik külső bejelentkezés.'); }

  async continueCaptcha(_input: CaptchaInput): Promise<AuthResult> { throw new ProviderError('unsupported-contract', 'A dokumentált régi szolgáltatás nem ad CAPTCHA-folytatási szerződést.'); }
  async continueTwoFactor(_input: TwoFactorInput): Promise<AuthResult> { throw new ProviderError('unsupported-contract', 'A dokumentált régi szolgáltatás nem ad kétlépcsős folytatási szerződést.'); }
  async refreshSession(session: Session): Promise<Session> { return session; }
  async logout(_session: Session): Promise<void> { this.credentials = undefined; this.session = undefined; }

  async getStudentProfile(): Promise<StudentProfile> {
    return { name: this.session?.userName ?? this.credentials?.userName ?? '' };
  }

  async getTrainings(): Promise<Training[]> {
    const data = await this.call('GetTrainings');
    return asArray(data.TrainingList).map((value) => { const row = asRecord(value); return { id: stringValue(row, 'Id', 'ID'), name: stringValue(row, 'Description', 'Name'), code: stringValue(row, 'Code') }; });
  }

  async selectTraining(_trainingId: string): Promise<void> {}

  async getTerms(_trainingId: string): Promise<Term[]> {
    const data = await this.call('GetPeriodTerms');
    return asArray(data.PeriodTermsList).map((value) => { const row = asRecord(value); return { id: stringValue(row, 'Id', 'ID'), name: stringValue(row, 'TermName', 'Name') }; });
  }

  async getCalendar(query: CalendarQuery): Promise<CalendarEvent[]> {
    const data = await this.call('GetCalendarData', { needAllDaylong: true, Time: true, Exam: true, Task: true, Apointment: true, RegisterList: true, Consultation: true, startDate: toLegacyDate(query.from), endDate: toLegacyDate(query.to), entityLimit: 0 });
    return asArray(data.calendarData).map((value) => { const row = asRecord(value); const rawType = stringValue(row, 'type').toLowerCase(); return { id: stringValue(row, 'id', 'Id'), title: stringValue(row, 'title', 'Title'), startsAt: parseNeptunDate(row.start), endsAt: parseNeptunDate(row.end), location: stringValue(row, 'location'), description: stringValue(row, 'description'), type: rawType.includes('exam') ? 'exam' : rawType.includes('task') ? 'task' : 'course' }; });
  }

  async getMessages(query: MessageQuery): Promise<Page<MessageSummary>> {
    const page = query.cursor ? Number(query.cursor) : 0;
    const data = await this.call('GetMessages', { CurrentPage: page });
    const all = asArray(data.MessagesList).map((value) => { const row = asRecord(value); return { id: stringValue(row, 'PersonMessageId', 'Id'), subject: stringValue(row, 'Subject'), sender: stringValue(row, 'Name', 'NeptunCode'), sentAt: parseNeptunDate(row.SendDate), preview: stringValue(row, 'Detail').replace(/<[^>]+>/g, ' ').trim(), isUnread: booleanValue(row, 'IsNew') }; });
    const searched = query.search ? all.filter((item) => matchesSearch(`${item.subject} ${item.sender} ${item.preview}`, query.search!)) : all;
    return { items: searched.slice(0, query.pageSize), nextCursor: searched.length >= query.pageSize ? String(page + 1) : undefined, total: typeof data.TotalRowCount === 'number' ? data.TotalRowCount : undefined };
  }

  async getMessage(messageId: string): Promise<MessageDetail> {
    let cursor: string | undefined;
    for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) { const page = await this.getMessages({ cursor, pageSize: 100 }); const found = page.items.find((message) => message.id === messageId); if (found) return { ...found, body: found.preview ?? '' }; cursor = page.nextCursor; if (!cursor) break; }
    throw new ProviderError('unsupported-contract', 'Az üzenet nem található.');
  }

  async getUnreadMessageCount(): Promise<number> {
    const data = await this.call('GetMessages');
    return typeof data.NewMessagesNumber === 'number' ? data.NewMessagesNumber : 0;
  }

  async getExams(query: ExamQuery): Promise<Exam[]> {
    const data = await this.call('GetExams', { filter: { ExamType: 0, Term: query.termId ? Number(query.termId) : 0, SubjectID: 0, ExamStart: '/Date(-62135596800000)/', ExamTypeSpinner: 0, IsFromSearch: false, SubjectName: '', CourseCode: '', KurzusOktato: '' } });
    return asArray(data.ExamsList).map((value) => { const row = asRecord(value); return { id: stringValue(row, 'CourseExam_ExamSigninID', 'CourseID'), subject: stringValue(row, 'SubjectName', 'SubjectCode'), startsAt: parseNeptunDate(row.FromDate), location: stringValue(row, 'RoomName', 'Location'), status: stringValue(row, 'ExamType') }; });
  }
}
