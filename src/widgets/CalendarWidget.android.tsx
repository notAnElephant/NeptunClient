'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { CalendarWidgetProps } from './calendarWidget';

interface Props {
  data: CalendarWidgetProps;
  width: number;
}

export function AndroidCalendarWidget({ data, width }: Props) {
  const wide = width >= 220;
  const visibleEvents = data.events.slice(0, wide ? 3 : 1);

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'neptuncompanion://calendar' }}
      accessibilityLabel="Közelgő Neptun naptáresemények"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        padding: 14,
        borderRadius: 20,
        backgroundColor: '#F5F7FB',
        flexDirection: 'column',
        flexGap: 8,
      }}
    >
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget text="NEPTUN" style={{ color: '#1B4D9B', fontSize: 13, fontWeight: 'bold' }} />
        <TextWidget text={data.updatedAtLabel} style={{ color: '#657083', fontSize: 10 }} maxLines={1} />
      </FlexWidget>

      {visibleEvents.length === 0 ? (
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'column', flexGap: 4 }}>
          <TextWidget text="Nincs közelgő esemény" style={{ color: '#172033', fontSize: 16, fontWeight: 'bold' }} maxLines={2} />
          <TextWidget text="A naptárad most üres." style={{ color: '#657083', fontSize: 11 }} maxLines={2} />
        </FlexWidget>
      ) : visibleEvents.map((event) => (
        <FlexWidget key={event.id} style={{ width: 'match_parent', flexDirection: 'column', flexGap: 2 }}>
          <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', flexGap: 6 }}>
            <TextWidget text={event.dateLabel} style={{ color: '#1B4D9B', fontSize: 11, fontWeight: 'bold' }} maxLines={1} />
            <TextWidget text={event.timeLabel} style={{ color: '#657083', fontSize: 11 }} maxLines={1} />
          </FlexWidget>
          <TextWidget text={event.title} style={{ color: '#172033', fontSize: 14, fontWeight: 'bold' }} maxLines={1} truncate="END" />
          {event.location ? <TextWidget text={event.location} style={{ color: '#657083', fontSize: 10 }} maxLines={1} truncate="END" /> : null}
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}
