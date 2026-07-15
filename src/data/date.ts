export function parseNeptunDate(value: unknown): string {
  if (typeof value === 'string') {
    const match = /\/Date\((-?\d+)/.exec(value);
    if (match) {
      const raw = Number(match[1]);
      const millis = Math.abs(raw) < 10_000_000_000 ? raw * 1000 : raw;
      return new Date(millis).toISOString();
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  if (typeof value === 'number') {
    const millis = Math.abs(value) < 10_000_000_000 ? value * 1000 : value;
    return new Date(millis).toISOString();
  }
  throw new Error('Invalid Neptun date');
}

export function toLegacyDate(value: string): string {
  return `/Date(${new Date(value).getTime()})/`;
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateFromKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function calendarGridRange(center = new Date()) {
  const firstOfMonth = new Date(center.getFullYear(), center.getMonth(), 1);
  const from = new Date(firstOfMonth);
  from.setDate(firstOfMonth.getDate() - ((firstOfMonth.getDay() + 6) % 7));
  from.setHours(0, 0, 0, 0);

  const to = new Date(from);
  to.setDate(from.getDate() + 41);
  to.setHours(23, 59, 59, 999);

  return { from: from.toISOString(), to: to.toISOString() };
}
