import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { AndroidCalendarWidget } from './CalendarWidget.android';
import { createCalendarWidgetProps } from './calendarWidget';
import { loadCalendarWidgetEvents } from './calendarWidgetStorage';

export async function androidWidgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetInfo.widgetName !== 'CalendarWidget') return;
  if (!['WIDGET_ADDED', 'WIDGET_UPDATE', 'WIDGET_RESIZED'].includes(props.widgetAction)) return;

  const { events, savedAt } = await loadCalendarWidgetEvents();
  props.renderWidget(
    <AndroidCalendarWidget
      data={createCalendarWidgetProps(events, new Date(), 4, savedAt ? new Date(savedAt) : new Date())}
      width={props.widgetInfo.width}
    />,
  );
}
