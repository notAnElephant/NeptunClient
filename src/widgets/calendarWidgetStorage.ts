import type { CalendarEvent } from '@/domain/models';
import { clearCache, readCache, writeCache } from '@/data/cache';

const WIDGET_ACCOUNT_KEY = '__calendar_widget__';
const WIDGET_CACHE_KEY = 'events';

export async function saveCalendarWidgetEvents(events: CalendarEvent[]): Promise<void> {
  await writeCache(WIDGET_ACCOUNT_KEY, WIDGET_CACHE_KEY, events);
}

export async function loadCalendarWidgetEvents(): Promise<{ events: CalendarEvent[]; savedAt?: string }> {
  const cached = await readCache<CalendarEvent[]>(WIDGET_ACCOUNT_KEY, WIDGET_CACHE_KEY);
  return { events: cached?.data ?? [], savedAt: cached?.savedAt };
}

export async function clearCalendarWidgetEvents(): Promise<void> {
  await clearCache(WIDGET_ACCOUNT_KEY);
}
