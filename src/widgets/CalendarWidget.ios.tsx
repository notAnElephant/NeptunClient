import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, lineLimit, padding, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { CalendarWidgetProps } from './calendarWidget';

function CalendarWidgetView(props: CalendarWidgetProps, environment: WidgetEnvironment) {
  'widget';
  const visibleEvents = props.events.slice(0, environment.widgetFamily === 'systemSmall' ? 1 : 3);

  return (
    <VStack
      alignment="leading"
      spacing={8}
      modifiers={[
        padding({ all: 4 }),
        containerBackground('#F5F7FB', 'widget'),
        widgetURL('neptuncompanion://calendar'),
      ]}
    >
      <HStack>
        <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle('#1B4D9B')]}>NEPTUN</Text>
        <Spacer />
        <Text modifiers={[font({ size: 10 }), foregroundStyle('#657083')]}>{props.updatedAtLabel}</Text>
      </HStack>

      {visibleEvents.length === 0 ? (
        <VStack alignment="leading" spacing={4}>
          <Text modifiers={[font({ size: 16, weight: 'semibold' }), foregroundStyle('#172033')]}>Nincs közelgő esemény</Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle('#657083')]}>Nyisd meg az appot a frissítéshez.</Text>
        </VStack>
      ) : visibleEvents.map((event) => (
        <VStack key={event.id} alignment="leading" spacing={2}>
          <HStack spacing={6}>
            <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle('#1B4D9B')]}>{event.dateLabel}</Text>
            <Text modifiers={[font({ size: 11 }), foregroundStyle('#657083')]}>{event.timeLabel}</Text>
          </HStack>
          <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle('#172033'), lineLimit(1)]}>{event.title}</Text>
          {event.location ? <Text modifiers={[font({ size: 10 }), foregroundStyle('#657083'), lineLimit(1)]}>{event.location}</Text> : null}
        </VStack>
      ))}
      <Spacer minLength={0} />
    </VStack>
  );
}

export const CalendarWidget = createWidget<CalendarWidgetProps>('CalendarWidget', CalendarWidgetView);
