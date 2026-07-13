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
