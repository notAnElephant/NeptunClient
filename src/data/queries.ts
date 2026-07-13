import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/state/SessionContext';
import type { CalendarEvent, Exam } from '@/domain/models';
import { getLocallyReadMessageIds, markMessageReadLocally, readCache, writeCache } from './cache';

function useProvider() {
  const { provider, session } = useSession();
  if (!provider || !session) throw new Error('Nincs aktív munkamenet.');
  return { provider, session, accountKey: `${session.institutionId}:${session.userName}` };
}

export function useTrainings() {
  const { provider, session } = useProvider();
  return useQuery({ queryKey: ['trainings', session.institutionId, session.userName], queryFn: () => provider.getTrainings(), staleTime: 10 * 60_000 });
}

export function useTerms() {
  const { provider, session } = useProvider();
  return useQuery({ queryKey: ['terms', session.institutionId, session.activeTrainingId], queryFn: () => provider.getTerms(session.activeTrainingId ?? ''), enabled: Boolean(session.activeTrainingId), staleTime: 30 * 60_000 });
}

export function calendarRange(center = new Date()) {
  const from = new Date(center); from.setHours(0, 0, 0, 0); from.setDate(from.getDate() - 7);
  const to = new Date(center); to.setHours(23, 59, 59, 999); to.setDate(to.getDate() + 21);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function useCalendar(center = new Date()) {
  const { provider, session, accountKey } = useProvider();
  const range = calendarRange(center);
  return useQuery({
    queryKey: ['calendar', session.institutionId, session.activeTrainingId, range.from.slice(0, 10)],
    queryFn: async () => {
      try { const data = await provider.getCalendar({ ...range, trainingId: session.activeTrainingId }); await writeCache(accountKey, 'calendar', data); return { data, cachedAt: null as string | null }; }
      catch (error) { const cached = await readCache<CalendarEvent[]>(accountKey, 'calendar'); if (cached) return { data: cached.data, cachedAt: cached.savedAt }; throw error; }
    }, staleTime: 5 * 60_000,
  });
}

export function useUnreadCount() {
  const { provider, session } = useProvider();
  return useQuery({ queryKey: ['unread', session.institutionId, session.userName], queryFn: () => provider.getUnreadMessageCount(), staleTime: 60_000 });
}

export function useExams(termId?: string) {
  const { provider, session, accountKey } = useProvider();
  return useQuery({
    queryKey: ['exams', session.institutionId, session.activeTrainingId, termId],
    queryFn: async () => {
      try { const data = await provider.getExams({ termId, trainingId: session.activeTrainingId }); await writeCache(accountKey, 'exams', data); return { data, cachedAt: null as string | null }; }
      catch (error) { const cached = await readCache<Exam[]>(accountKey, 'exams'); if (cached) return { data: cached.data, cachedAt: cached.savedAt }; throw error; }
    }, staleTime: 5 * 60_000,
  });
}

export function useMessages(search: string) {
  const { provider, session, accountKey } = useProvider();
  return useQuery({ queryKey: ['messages', session.institutionId, search], queryFn: async () => { const [page, reads] = await Promise.all([provider.getMessages({ pageSize: 30, search: search || undefined }), getLocallyReadMessageIds(accountKey)]); return { ...page, items: page.items.map((message) => reads.has(message.id) ? { ...message, isUnread: false } : message) }; }, staleTime: 60_000 });
}

export function useMessage(messageId: string) {
  const { provider, session, accountKey } = useProvider();
  const queryClient = useQueryClient();
  return useQuery({ queryKey: ['message', session.institutionId, messageId], queryFn: async () => { const message = await provider.getMessage(messageId); await markMessageReadLocally(accountKey, messageId); await queryClient.invalidateQueries({ queryKey: ['messages', session.institutionId] }); return { ...message, isUnread: false }; }, staleTime: 5 * 60_000 });
}
