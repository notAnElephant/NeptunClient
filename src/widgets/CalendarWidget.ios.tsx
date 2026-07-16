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

      {visibleEvents[0] ? (
        <VStack alignment="leading" spacing={2}>
          <HStack spacing={6}>
            <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle('#1B4D9B')]}>{visibleEvents[0].dateLabel}</Text>
            <Text modifiers={[font({ size: 11 }), foregroundStyle('#657083')]}>{visibleEvents[0].timeLabel}</Text>
          </HStack>
          <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle('#172033'), lineLimit(1)]}>{visibleEvents[0].title}</Text>
          {visibleEvents[0].location ? <Text modifiers={[font({ size: 10 }), foregroundStyle('#657083'), lineLimit(1)]}>{visibleEvents[0].location}</Text> : null}
        </VStack>
      ) : (
        <VStack alignment="leading" spacing={4}>
          <Text modifiers={[font({ size: 16, weight: 'semibold' }), foregroundStyle('#172033')]}>Nincs közelgő esemény</Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle('#657083')]}>A naptárad most üres.</Text>
        </VStack>
      )}
      {visibleEvents[1] ? (
        <VStack alignment="leading" spacing={2}>
          <HStack spacing={6}>
            <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle('#1B4D9B')]}>{visibleEvents[1].dateLabel}</Text>
            <Text modifiers={[font({ size: 11 }), foregroundStyle('#657083')]}>{visibleEvents[1].timeLabel}</Text>
          </HStack>
          <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle('#172033'), lineLimit(1)]}>{visibleEvents[1].title}</Text>
          {visibleEvents[1].location ? <Text modifiers={[font({ size: 10 }), foregroundStyle('#657083'), lineLimit(1)]}>{visibleEvents[1].location}</Text> : null}
        </VStack>
      ) : null}
      {visibleEvents[2] ? (
        <VStack alignment="leading" spacing={2}>
          <HStack spacing={6}>
            <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle('#1B4D9B')]}>{visibleEvents[2].dateLabel}</Text>
            <Text modifiers={[font({ size: 11 }), foregroundStyle('#657083')]}>{visibleEvents[2].timeLabel}</Text>
          </HStack>
          <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle('#172033'), lineLimit(1)]}>{visibleEvents[2].title}</Text>
          {visibleEvents[2].location ? <Text modifiers={[font({ size: 10 }), foregroundStyle('#657083'), lineLimit(1)]}>{visibleEvents[2].location}</Text> : null}
        </VStack>
      ) : null}
      <Spacer minLength={0} />
    </VStack>
  );
}

export const CalendarWidget = createWidget<CalendarWidgetProps>('CalendarWidget', CalendarWidgetView);
