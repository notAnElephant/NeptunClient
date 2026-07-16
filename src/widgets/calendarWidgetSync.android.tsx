import type { CalendarEvent } from '@/domain/models';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { AndroidCalendarWidget } from './CalendarWidget.android';
import { createCalendarWidgetProps } from './calendarWidget';
import { clearCalendarWidgetEvents, saveCalendarWidgetEvents } from './calendarWidgetStorage';

export async function syncCalendarWidgets(events: CalendarEvent[]): Promise<void> {
  await saveCalendarWidgetEvents(events);
  await requestWidgetUpdate({
    widgetName: 'CalendarWidget',
    renderWidget: ({ width }) => <AndroidCalendarWidget data={createCalendarWidgetProps(events)} width={width} />,
  });
}

export async function clearCalendarWidgets(): Promise<void> {
  await clearCalendarWidgetEvents();
  await requestWidgetUpdate({
    widgetName: 'CalendarWidget',
    renderWidget: ({ width }) => <AndroidCalendarWidget data={createCalendarWidgetProps([])} width={width} />,
  });
}
