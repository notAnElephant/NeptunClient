export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected object');
  return value as Record<string, unknown>;
}

export function asArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('Expected array');
  return value;
}

export function stringValue(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' || typeof value === 'number') return String(value);
  }
  return '';
}

export function booleanValue(record: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) if (typeof record[key] === 'boolean') return record[key] as boolean;
  return false;
}

export function unwrapData(value: unknown): unknown {
  const record = asRecord(value);
  return 'data' in record ? record.data : value;
}
