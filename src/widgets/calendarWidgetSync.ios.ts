import type { CalendarEvent } from '@/domain/models';
import { createCalendarWidgetProps, createCalendarWidgetTimeline } from './calendarWidget';
import { clearCalendarWidgetEvents, saveCalendarWidgetEvents } from './calendarWidgetStorage';

const iosWidgetsDisabled = process.env.EXPO_PUBLIC_DISABLE_IOS_WIDGET === 'true';

export async function syncCalendarWidgets(events: CalendarEvent[]): Promise<void> {
  await saveCalendarWidgetEvents(events);
  if (iosWidgetsDisabled) return;

  const { CalendarWidget } = await import('./CalendarWidget.ios');
  CalendarWidget.updateTimeline(createCalendarWidgetTimeline(events));
}

export async function clearCalendarWidgets(): Promise<void> {
  await clearCalendarWidgetEvents();
  if (iosWidgetsDisabled) return;

  const { CalendarWidget } = await import('./CalendarWidget.ios');
  CalendarWidget.updateSnapshot(createCalendarWidgetProps([]));
}
