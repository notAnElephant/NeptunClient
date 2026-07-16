import type { CalendarEvent } from '@/domain/models';
import { CalendarWidget } from './CalendarWidget.ios';
import { createCalendarWidgetProps, createCalendarWidgetTimeline } from './calendarWidget';
import { clearCalendarWidgetEvents, saveCalendarWidgetEvents } from './calendarWidgetStorage';

export async function syncCalendarWidgets(events: CalendarEvent[]): Promise<void> {
  await saveCalendarWidgetEvents(events);
  CalendarWidget.updateTimeline(createCalendarWidgetTimeline(events));
}

export async function clearCalendarWidgets(): Promise<void> {
  await clearCalendarWidgetEvents();
  CalendarWidget.updateSnapshot(createCalendarWidgetProps([]));
}
