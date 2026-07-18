const SENSITIVE_KEY = /(?:password|passwd|secret|access.?token|refresh.?token|authorization|cookie|captcha|guid|neptun.?code|user.?name|two.?factor|2fa|otp)/i;
const DIAGNOSTIC_FORBIDDEN_KEY = /(?:body|html|headers?|request|response|raw|fragment|hash|full.?url|current.?url|location)/i;
const GUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const GUID_VALUE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const BEARER_VALUE = /\bBearer\s+[A-Za-z0-9._~+/=-]+/i;
const POSTHOG_TOKEN = /\bphc_[A-Za-z0-9]+\b/g;
const SENSITIVE_QUERY_VALUE = /([?&](?:key|neptuncode|guid|token|access_token|refresh_token|password|code)=)[^&#\s]*/gi;
const NEPTUN_DISTINCT_ID = /^[A-Z0-9]{6}$/i;
const RAW_URL_VALUE = /^https?:\/\//i;
const QUERY_VALUE = /[?&][^=&#\s]+=[^&#\s]*/;
const FRAGMENT_VALUE = /(?:^|\/)\S*#[^\s]+/;
const HTML_VALUE = /<\s*(?:!doctype\s+html|html\b|body\b|form\b|input\b|script\b)/i;
const SENSITIVE_DIAGNOSTIC_TEXT = /(?:password|passwd|access.?token|refresh.?token|authorization|cookie|captcha|guid|neptun.?code|user.?name|two.?factor|2fa|otp)\s*[:=]\s*\S+/i;
const DIAGNOSTIC_ALLOWED_PROPERTIES = new Set([
  'attempt_id', 'institution_id', 'institution_name', 'strategy', 'support_status', 'config_revision',
  'step_index', 'stage', 'operation', 'method', 'host', 'path', 'query_keys', 'status', 'content_type',
  'duration_ms', 'redirect_host', 'redirect_path', 'redirect_query_keys', 'error_code', 'reason',
  'schema_signature', 'probe_event', 'failure_stage', 'recorded_step_count',
]);
const DIAGNOSTIC_ALLOWED_POSTHOG_PROPERTIES = new Set([
  '$distinct_id', '$lib', '$lib_version', '$os', '$os_version', '$device_type', '$app_version', '$app_build', '$process_person_profile',
]);
type JsonValue = string | number | boolean | null | undefined | { [key: string]: JsonValue } | JsonValue[];

function sanitizeStandaloneUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return value;
    const keys = [...new Set(url.searchParams.keys())].sort();
    return `${url.origin}${url.pathname}${keys.length ? `?${keys.map((key) => `${encodeURIComponent(key)}=[REDACTED]`).join('&')}` : ''}`;
  } catch {
    return value;
  }
}

function redactText(value: string): string {
  return sanitizeStandaloneUrl(value)
    .replace(BEARER, 'Bearer [REDACTED]')
    .replace(GUID, '[REDACTED_GUID]')
    .replace(POSTHOG_TOKEN, '[REDACTED_POSTHOG_TOKEN]')
    .replace(SENSITIVE_QUERY_VALUE, '$1[REDACTED]');
}

function containsForbiddenDiagnosticData(value: JsonValue, key?: string): boolean {
  if (key && (SENSITIVE_KEY.test(key) || DIAGNOSTIC_FORBIDDEN_KEY.test(key))) return true;
  if (typeof value === 'string' && (
    GUID_VALUE.test(value)
    || BEARER_VALUE.test(value)
    || RAW_URL_VALUE.test(value)
    || QUERY_VALUE.test(value)
    || FRAGMENT_VALUE.test(value)
    || HTML_VALUE.test(value)
    || SENSITIVE_DIAGNOSTIC_TEXT.test(value)
  )) return true;
  if (Array.isArray(value)) return value.some((item) => containsForbiddenDiagnosticData(item));
  if (value && typeof value === 'object') return Object.entries(value).some(([entryKey, entryValue]) => containsForbiddenDiagnosticData(entryValue, entryKey));
  return false;
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

export function sanitizePostHogEvent<T extends { event?: string; properties?: Record<string, JsonValue> }>(event: T): T | null {
  const distinctId = event.properties?.$distinct_id;
  if (typeof distinctId === 'string' && NEPTUN_DISTINCT_ID.test(distinctId)) return null;
  if (event.event?.startsWith('university_')) {
    if (!event.properties || typeof event.properties !== 'object' || Array.isArray(event.properties)) return null;
    const diagnosticProperties = Object.fromEntries(Object.entries(event.properties).filter(([key]) => (
      key.startsWith('$') ? DIAGNOSTIC_ALLOWED_POSTHOG_PROPERTIES.has(key) : DIAGNOSTIC_ALLOWED_PROPERTIES.has(key)
    ))) as Record<string, JsonValue>;
    if (Object.keys(event.properties).some((key) => !key.startsWith('$') && !DIAGNOSTIC_ALLOWED_PROPERTIES.has(key))) return null;
    if (containsForbiddenDiagnosticData(diagnosticProperties)) return null;
    return { ...event, properties: redactPostHogProperties(diagnosticProperties) };
  }
  return { ...event, properties: redactPostHogProperties(event.properties) };
}
