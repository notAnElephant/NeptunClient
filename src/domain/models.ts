export type ProviderKind = 'modern' | 'legacy';

export interface Institution {
  id: string;
  name: string;
  omCode: string;
  url: string | null;
  languages: string[];
  provider: ProviderKind;
}

export interface Session {
  institutionId: string;
  provider: ProviderKind;
  userName: string;
  accessToken?: string;
  expiresAt?: string;
  activeTrainingId?: string;
}

export interface StudentProfile { name: string }
export interface Training { id: string; name: string; code?: string; faculty?: string; isActive?: boolean }
export interface Term { id: string; name: string; isActive?: boolean }
export type CalendarEventType = 'course' | 'exam' | 'task' | 'other';
export interface CalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  description?: string;
  type: CalendarEventType;
}
export interface MessageSummary { id: string; subject: string; sender: string; sentAt: string; preview?: string; isUnread: boolean }
export interface MessageDetail extends MessageSummary { body: string }
export interface Exam { id: string; subject: string; startsAt: string; location?: string; result?: string; status?: string }
export interface Page<T> { items: T[]; nextCursor?: string; total?: number }

export type ApiErrorCode = 'authentication' | 'connectivity' | 'unsupported-contract' | 'malformed-response' | 'server';
export type ApiResult<T> = { ok: true; data: T } | { ok: false; code: ApiErrorCode; message: string; status?: number };

export interface LoginInput { institution: Institution; userName: string; password: string; rememberMe?: boolean }
export interface CaptchaInput { identifier: string; answer: string }
export interface TwoFactorInput { code: string }
export type AuthResult =
  | { state: 'authenticated'; session: Session }
  | { state: 'captchaRequired'; identifier: string; imageUrl?: string }
  | { state: 'twoFactorRequired'; challengeId?: string };
export interface CalendarQuery { from: string; to: string; trainingId?: string }
export interface MessageQuery { cursor?: string; pageSize: number; search?: string }
export interface ExamQuery { termId?: string; trainingId?: string }
