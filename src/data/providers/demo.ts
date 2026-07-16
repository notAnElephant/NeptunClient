import type { NeptunProvider } from '@/domain/provider';
import type { AuthResult, CalendarEvent, CalendarQuery, CaptchaInput, Exam, ExamQuery, ExternalLoginInput, LoginInput, MessageDetail, MessageQuery, MessageSummary, Page, Session, StudentProfile, Term, Training, TwoFactorInput } from '@/domain/models';
import { matchesSearch } from '@/data/search';

function iso(days: number, hour: number, minute = 0): string { const value = new Date(); value.setDate(value.getDate() + days); value.setHours(hour, minute, 0, 0); return value.toISOString(); }

const events: CalendarEvent[] = [
  { id: 'event-1', title: 'Analízis 2', startsAt: iso(0, 10, 15), endsAt: iso(0, 11, 45), location: 'K épület, K.II.26', type: 'course' },
  { id: 'event-2', title: 'Programozás alapjai', startsAt: iso(0, 12), endsAt: iso(0, 13, 30), location: 'Q épület, Q.I.12', type: 'task' },
  { id: 'event-3', title: 'Fizika', startsAt: iso(0, 14), endsAt: iso(0, 15, 30), location: 'I épület, I.22', type: 'exam' },
];
const messages: MessageDetail[] = [
  { id: 'message-1', subject: 'Vizsgajegy beírás történt', sender: 'Neptun üzemeltetés', sentAt: iso(0, 9, 15), preview: 'Tisztelt Hallgató! Vizsgajegyet rögzítettünk.', body: '<style>.notice { color: red; }</style><p><strong>Tisztelt Hallgató!</strong></p><p>Az Analízis 2 tárgyból vizsgajegyet rögzítettünk a Neptunban.</p><p><a href="https://neptun.bme.hu">Neptun megnyitása</a></p><script>alert("unsafe")</script>', isUnread: true },
  { id: 'message-2', subject: 'Tárgyfelvételi időszak', sender: 'Tanulmányi Osztály', sentAt: iso(-1, 14), preview: 'Megkezdődött a tárgyfelvételi időszak.', body: 'Megkezdődött a következő félévre vonatkozó tárgyfelvételi időszak.', isUnread: true },
  { id: 'message-3', subject: 'Rendszerkarbantartás', sender: 'Neptun üzemeltetés', sentAt: iso(-2, 12), preview: 'Tervezett karbantartás lesz a hétvégén.', body: 'A Neptun rendszerben tervezett karbantartás lesz a hétvégén.', isUnread: false },
];
const exams: Exam[] = [{ id: 'exam-1', subject: 'Analízis 2', startsAt: iso(3, 8), location: 'K épület, K.II.26', status: 'Írásbeli' }, { id: 'exam-2', subject: 'Fizika', startsAt: iso(-12, 10), result: 'Jó (4)' }];

export class DemoProvider implements NeptunProvider {
  async authenticate(_input: LoginInput): Promise<AuthResult> { return { state: 'authenticated', session: { institutionId: 'FI23344', provider: 'modern', userName: 'ABC123', activeTrainingId: 'training-1' } }; }
  async authenticateExternal(_input: ExternalLoginInput): Promise<AuthResult> { throw new Error('Not used'); }
  async continueCaptcha(_input: CaptchaInput): Promise<AuthResult> { throw new Error('Not used'); }
  async continueTwoFactor(_input: TwoFactorInput): Promise<AuthResult> { throw new Error('Not used'); }
  async refreshSession(session: Session): Promise<Session> { return session; }
  async logout(_session: Session): Promise<void> {}
  async getStudentProfile(): Promise<StudentProfile> { return { name: 'Minta Elek' }; }
  async getTrainings(): Promise<Training[]> { return [{ id: 'training-1', name: 'Mérnökinformatikus BSc', code: 'BME-VIK' }]; }
  async selectTraining(_trainingId: string): Promise<void> {}
  async getTerms(_trainingId: string): Promise<Term[]> { return [{ id: 'term-1', name: '2025/26/1', isActive: true }]; }
  async getCalendar(_query: CalendarQuery): Promise<CalendarEvent[]> { return events; }
  async getMessages(query: MessageQuery): Promise<Page<MessageSummary>> { const filtered = query.search ? messages.filter((message) => matchesSearch(`${message.subject} ${message.sender} ${message.preview ?? ''}`, query.search!)) : messages; return { items: filtered, total: filtered.length }; }
  async getMessage(messageId: string): Promise<MessageDetail> { const message = messages.find((item) => item.id === messageId); if (!message) throw new Error('Az üzenet nem található.'); return message; }
  async getUnreadMessageCount(): Promise<number> { return messages.filter((message) => message.isUnread).length; }
  async getExams(_query: ExamQuery): Promise<Exam[]> { return exams; }
}
