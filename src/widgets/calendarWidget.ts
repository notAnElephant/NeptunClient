import type { CalendarEvent } from '@/domain/models';

export interface CalendarWidgetEvent {
  id: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  location?: string;
  startsAt: string;
  endsAt: string;
}

export interface CalendarWidgetProps {
  updatedAtLabel: string;
  events: CalendarWidgetEvent[];
}

const timeFormatter = new Intl.DateTimeFormat('hu-HU', { hour: '2-digit', minute: '2-digit' });
const dateFormatter = new Intl.DateTimeFormat('hu-HU', { month: 'short', day: 'numeric', weekday: 'short' });

function isSameLocalDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function dateLabel(date: Date, reference: Date): string {
  if (isSameLocalDay(date, reference)) return 'Ma';
  const tomorrow = new Date(reference);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameLocalDay(date, tomorrow)) return 'Holnap';
  return dateFormatter.format(date);
}

export function createCalendarWidgetProps(
  events: CalendarEvent[],
  reference = new Date(),
  limit = 4,
  updatedAt = reference,
): CalendarWidgetProps {
  const upcoming = events
    .filter((event) => new Date(event.endsAt).getTime() > reference.getTime())
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
    .slice(0, limit)
    .map((event) => {
      const start = new Date(event.startsAt);
      const end = new Date(event.endsAt);
      return {
        id: event.id,
        title: event.title,
        dateLabel: dateLabel(start, reference),
        timeLabel: `${timeFormatter.format(start)}–${timeFormatter.format(end)}`,
        location: event.location || undefined,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
      };
    });

  return {
    events: upcoming,
    updatedAtLabel: `Frissítve ${timeFormatter.format(updatedAt)}`,
  };
}

export function createCalendarWidgetTimeline(events: CalendarEvent[], now = new Date()) {
  const transitionDates = events
    .map((event) => new Date(event.endsAt))
    .filter((date) => date.getTime() > now.getTime())
    .sort((left, right) => left.getTime() - right.getTime())
    .slice(0, 8);

  return [now, ...transitionDates].map((date, index) => {
    const reference = index === 0 ? date : new Date(date.getTime() + 1_000);
    return { date, props: createCalendarWidgetProps(events, reference, 4, now) };
  });
}
