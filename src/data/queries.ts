import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/state/SessionContext';
import type { CalendarEvent, Exam } from '@/domain/models';
import { getLocallyReadMessageIds, markMessageReadLocally, readCache, writeCache } from './cache';
import { calendarGridRange } from './date';
import { ProviderError } from './errors';
import { matchesSearch } from './search';
import { captureFeatureUsed } from '@/config/analytics';
import { posthog } from '@/config/posthog';
import { syncCalendarWidgets } from '@/widgets/calendarWidgetSync';

function useProvider() {
  const { provider, session, withAuthentication } = useSession();
  if (!provider || !session) throw new Error('Nincs aktív munkamenet.');
  return { session, withAuthentication, accountKey: `${session.institutionId}:${session.userName}` };
}

export function useTrainings() {
  const { withAuthentication, session } = useProvider();
  return useQuery({ queryKey: ['trainings', session.institutionId, session.userName], queryFn: async () => { const data = await withAuthentication((provider) => provider.getTrainings()); captureFeatureUsed(session, 'trainings'); return data; }, staleTime: 10 * 60_000 });
}

export function useStudentProfile() {
  const { withAuthentication, session } = useProvider();
  return useQuery({ queryKey: ['student-profile', session.institutionId, session.userName], queryFn: async () => { const data = await withAuthentication((provider) => provider.getStudentProfile()); captureFeatureUsed(session, 'student_profile'); return data; }, staleTime: 60 * 60_000 });
}

export function useTerms() {
  const { withAuthentication, session } = useProvider();
  return useQuery({ queryKey: ['terms', session.institutionId, session.activeTrainingId], queryFn: async () => { const data = await withAuthentication((provider) => provider.getTerms(session.activeTrainingId ?? '')); captureFeatureUsed(session, 'terms'); return data; }, enabled: Boolean(session.activeTrainingId), staleTime: 30 * 60_000 });
}

export function useCalendar(center = new Date()) {
  const { withAuthentication, session, accountKey } = useProvider();
  const range = calendarGridRange(center);
  return useQuery({
    queryKey: ['calendar', session.institutionId, session.activeTrainingId, range.from, range.to],
    queryFn: async () => {
      try { const data = await withAuthentication((provider) => provider.getCalendar({ ...range, trainingId: session.activeTrainingId })); captureFeatureUsed(session, 'calendar'); await writeCache(accountKey, 'calendar', data); void syncCalendarWidgets(data).then(() => posthog.capture('widget_data_updated', { event_count: data.length })).catch((error) => posthog.captureException(error instanceof Error ? error : new Error(String(error)))); return { data, cachedAt: null as string | null }; }
      catch (error) { if (error instanceof ProviderError && error.code === 'authentication') throw error; const cached = await readCache<CalendarEvent[]>(accountKey, 'calendar'); if (cached) return { data: cached.data, cachedAt: cached.savedAt }; throw error; }
    }, staleTime: 5 * 60_000,
  });
}

export function useUnreadCount() {
  const { withAuthentication, session } = useProvider();
  return useQuery({ queryKey: ['unread', session.institutionId, session.userName], queryFn: async () => { const data = await withAuthentication((provider) => provider.getUnreadMessageCount()); captureFeatureUsed(session, 'unread_messages'); return data; }, staleTime: 60_000 });
}

export function useExams(termId?: string) {
  const { withAuthentication, session, accountKey } = useProvider();
  return useQuery({
    queryKey: ['exams', session.institutionId, session.activeTrainingId, termId],
    queryFn: async () => {
      try { const data = await withAuthentication((provider) => provider.getExams({ termId, trainingId: session.activeTrainingId })); captureFeatureUsed(session, 'exams'); await writeCache(accountKey, 'exams', data); return { data, cachedAt: null as string | null }; }
      catch (error) { if (error instanceof ProviderError && error.code === 'authentication') throw error; const cached = await readCache<Exam[]>(accountKey, 'exams'); if (cached) return { data: cached.data, cachedAt: cached.savedAt }; throw error; }
    }, staleTime: 5 * 60_000,
  });
}

export function useMessages(search: string) {
  const { withAuthentication, session, accountKey } = useProvider();
  return useQuery({ queryKey: ['messages', session.institutionId, search], queryFn: async () => { const [page, reads] = await Promise.all([withAuthentication((provider) => provider.getMessages({ pageSize: 30, search: search || undefined })), getLocallyReadMessageIds(accountKey)]); captureFeatureUsed(session, 'messages'); const items = page.items.filter((message) => matchesSearch(`${message.subject} ${message.sender} ${message.preview ?? ''}`, search)).map((message) => reads.has(message.id) ? { ...message, isUnread: false } : message); return { ...page, items }; }, staleTime: 60_000 });
}

export function useMessage(messageId: string) {
  const { withAuthentication, session, accountKey } = useProvider();
  const queryClient = useQueryClient();
  return useQuery({ queryKey: ['message', session.institutionId, messageId], queryFn: async () => { const message = await withAuthentication((provider) => provider.getMessage(messageId)); captureFeatureUsed(session, 'message_detail'); await markMessageReadLocally(accountKey, messageId); await queryClient.invalidateQueries({ queryKey: ['messages', session.institutionId] }); return { ...message, isUnread: false }; }, staleTime: 5 * 60_000 });
}
