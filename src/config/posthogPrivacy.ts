const SENSITIVE_KEY = /(?:password|passwd|secret|access.?token|refresh.?token|authorization|cookie|captcha|guid|neptun.?code|user.?name|two.?factor|2fa|otp)/i;
const GUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const POSTHOG_TOKEN = /\bphc_[A-Za-z0-9]+\b/g;
const SENSITIVE_QUERY_VALUE = /([?&](?:key|neptuncode|guid|token|access_token|refresh_token|password|code)=)[^&#\s]*/gi;
type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

function redactText(value: string): string {
  return value
    .replace(BEARER, 'Bearer [REDACTED]')
    .replace(GUID, '[REDACTED_GUID]')
    .replace(POSTHOG_TOKEN, '[REDACTED_POSTHOG_TOKEN]')
    .replace(SENSITIVE_QUERY_VALUE, '$1[REDACTED]');
}

function redactValue(value: JsonValue, key?: string): JsonValue {
  if (key && SENSITIVE_KEY.test(key)) return '[REDACTED]';
  if (typeof value === 'string') return redactText(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redactValue(entryValue, entryKey)]));
  }
  return value;
}

export function redactPostHogProperties<T extends Record<string, JsonValue> | undefined>(properties: T): T {
  if (!properties) return properties;
  return redactValue(properties) as T;
}
