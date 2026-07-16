import { describe, expect, it } from 'vitest';
import { createCalendarWidgetProps, createCalendarWidgetTimeline } from './calendarWidget';

const events = [
  { id: 'past', title: 'Past', startsAt: '2026-07-16T08:00:00+02:00', endsAt: '2026-07-16T09:00:00+02:00', type: 'course' as const },
  { id: 'next', title: 'Algorithms', startsAt: '2026-07-16T11:00:00+02:00', endsAt: '2026-07-16T12:30:00+02:00', location: 'D 0-803', type: 'course' as const },
  { id: 'tomorrow', title: 'Databases', startsAt: '2026-07-17T09:00:00+02:00', endsAt: '2026-07-17T10:00:00+02:00', type: 'course' as const },
];

describe('calendar widget data', () => {
  it('keeps upcoming events in chronological order with compact labels', () => {
    const result = createCalendarWidgetProps(events, new Date('2026-07-16T10:00:00+02:00'));
    expect(result.events.map((event) => event.id)).toEqual(['next', 'tomorrow']);
    expect(result.events[0]).toMatchObject({ dateLabel: 'Ma', timeLabel: '11:00–12:30', location: 'D 0-803' });
    expect(result.events[1]?.dateLabel).toBe('Holnap');
  });

  it('advances the timeline after events finish', () => {
    const timeline = createCalendarWidgetTimeline(events, new Date('2026-07-16T10:00:00+02:00'));
    expect(timeline[0]?.props.events[0]?.id).toBe('next');
    expect(timeline[1]?.props.events[0]?.id).toBe('tomorrow');
  });
});
