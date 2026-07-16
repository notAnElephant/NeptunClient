import type { CalendarEvent } from '@/domain/models';
import { clearCalendarWidgetEvents, saveCalendarWidgetEvents } from './calendarWidgetStorage';

export async function syncCalendarWidgets(events: CalendarEvent[]): Promise<void> {
  await saveCalendarWidgetEvents(events);
}

export async function clearCalendarWidgets(): Promise<void> {
  await clearCalendarWidgetEvents();
}
