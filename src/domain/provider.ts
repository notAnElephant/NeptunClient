import type { AuthResult, CalendarEvent, CalendarQuery, CaptchaInput, Exam, ExamQuery, LoginInput, MessageDetail, MessageQuery, MessageSummary, Page, Session, StudentProfile, Term, Training, TwoFactorInput } from './models';

export interface NeptunProvider {
  authenticate(input: LoginInput): Promise<AuthResult>;
  continueCaptcha(input: CaptchaInput): Promise<AuthResult>;
  continueTwoFactor(input: TwoFactorInput): Promise<AuthResult>;
  refreshSession(session: Session): Promise<Session>;
  logout(session: Session): Promise<void>;
  getStudentProfile(): Promise<StudentProfile>;
  getTrainings(): Promise<Training[]>;
  selectTraining(trainingId: string): Promise<void>;
  getTerms(trainingId: string): Promise<Term[]>;
  getCalendar(query: CalendarQuery): Promise<CalendarEvent[]>;
  getMessages(query: MessageQuery): Promise<Page<MessageSummary>>;
  getMessage(messageId: string): Promise<MessageDetail>;
  getUnreadMessageCount(): Promise<number>;
  getExams(query: ExamQuery): Promise<Exam[]>;
}
