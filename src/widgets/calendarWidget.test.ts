import { describe, expect, it } from 'vitest';
import { createCalendarWidgetProps, createCalendarWidgetTimeline } from './calendarWidget';

const timeFormatter = new Intl.DateTimeFormat('hu-HU', { hour: '2-digit', minute: '2-digit' });

const events = [
  { id: 'past', title: 'Past', startsAt: '2026-07-16T08:00:00+02:00', endsAt: '2026-07-16T09:00:00+02:00', type: 'course' as const },
  { id: 'next', title: 'Algorithms', startsAt: '2026-07-16T11:00:00+02:00', endsAt: '2026-07-16T12:30:00+02:00', location: 'D 0-803', type: 'course' as const },
  { id: 'tomorrow', title: 'Databases', startsAt: '2026-07-17T09:00:00+02:00', endsAt: '2026-07-17T10:00:00+02:00', type: 'course' as const },
];

describe('calendar widget data', () => {
  it('keeps upcoming events in chronological order with compact labels', () => {
    const result = createCalendarWidgetProps(events, new Date('2026-07-16T10:00:00+02:00'));
    expect(result.events.map((event) => event.id)).toEqual(['next', 'tomorrow']);
    const expectedTimeLabel = `${timeFormatter.format(new Date(events[1].startsAt))}–${timeFormatter.format(new Date(events[1].endsAt))}`;
    expect(result.events[0]).toMatchObject({ dateLabel: 'Ma', timeLabel: expectedTimeLabel, location: 'D 0-803' });
    expect(result.events[1]?.dateLabel).toBe('Holnap');
  });

  it('returns an empty widget state when no events are upcoming', () => {
    const result = createCalendarWidgetProps(events, new Date('2026-07-18T10:00:00+02:00'));
    expect(result.events).toEqual([]);
  });

  it('creates a stable fallback key when the provider omits an event ID', () => {
    const result = createCalendarWidgetProps([{ ...events[1], id: '' }], new Date('2026-07-16T10:00:00+02:00'));
    expect(result.events[0]?.id).toContain('Algorithms');
  });

  it('advances the timeline after events finish', () => {
    const timeline = createCalendarWidgetTimeline(events, new Date('2026-07-16T10:00:00+02:00'));
    expect(timeline[0]?.props.events[0]?.id).toBe('next');
    expect(timeline[1]?.props.events[0]?.id).toBe('tomorrow');
  });
});
