export type LoginDiagnosticStage =
  | 'initial-login'
  | 'captcha'
  | 'two-factor'
  | 'external-exchange'
  | 'user-info'
  | 'compatibility-probe';

export type StructuralFailureReason =
  | 'missing-endpoint'
  | 'login-redirect'
  | 'html-response'
  | 'malformed-json'
  | 'unsupported-status'
  | 'missing-required-fields'
  | 'invalid-url';

export interface DiagnosticUrlMetadata {
  host: string;
  path: string;
  query_keys: string[];
}

export interface LoginDiagnosticStep {
  stage: LoginDiagnosticStage;
  operation: string;
  method?: 'GET' | 'POST';
  host?: string;
  path?: string;
  query_keys?: string[];
  status?: number;
  content_type?: string;
  duration_ms?: number;
  redirect_host?: string;
  redirect_path?: string;
  redirect_query_keys?: string[];
  error_code?: string;
  reason?: StructuralFailureReason;
  schema_signature?: string[];
  probe_event?: 'navigation' | 'load-error' | 'http-error' | 'callback-shape' | 'closed' | 'backgrounded';
}

const MAX_SCHEMA_ENTRIES = 40;
const MAX_SCHEMA_DEPTH = 3;
const SENSITIVE_METADATA_NAME = /(?:password|passwd|secret|access.?token|refresh.?token|authorization|cookie|captcha|guid|neptun.?code|user.?name|two.?factor|2fa|otp)/i;
const UUID_PATH_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HIGH_ENTROPY_PATH_SEGMENT = /^[A-Za-z0-9._~-]{32,}$/;

function safeMetadataName(value: string): string {
  return SENSITIVE_METADATA_NAME.test(value) ? '[redacted]' : value;
}

function safePath(pathname: string): string {
  return pathname.split('/').map((segment) => {
    let decoded = segment;
    try { decoded = decodeURIComponent(segment); }
    catch { /* Keep the encoded segment when it is malformed. */ }
    return UUID_PATH_SEGMENT.test(decoded) || HIGH_ENTROPY_PATH_SEGMENT.test(decoded) ? '[redacted]' : segment;
  }).join('/') || '/';
}

function valueType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function visitSchema(value: unknown, path: string, depth: number, output: string[]): void {
  if (output.length >= MAX_SCHEMA_ENTRIES) return;
  const type = valueType(value);
  if (path) output.push(`${path}:${type}`);
  if (output.length >= MAX_SCHEMA_ENTRIES || depth >= MAX_SCHEMA_DEPTH) return;
  if (Array.isArray(value)) {
    if (value.length > 0) visitSchema(value[0], path ? `${path}[]` : '[]', depth + 1, output);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    if (output.length >= MAX_SCHEMA_ENTRIES) break;
    const safeKey = safeMetadataName(key);
    visitSchema((value as Record<string, unknown>)[key], path ? `${path}.${safeKey}` : safeKey, depth + 1, output);
  }
}

export function createResponseSchemaSignature(value: unknown): string[] {
  const output: string[] = [];
  visitSchema(value, '', 0, output);
  return output.sort().slice(0, MAX_SCHEMA_ENTRIES);
}

export function diagnosticUrlMetadata(rawUrl: string, baseUrl?: string): DiagnosticUrlMetadata | null {
  try {
    const url = baseUrl ? new URL(rawUrl, baseUrl) : new URL(rawUrl);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return {
      host: url.hostname.toLowerCase(),
      path: safePath(url.pathname || '/'),
      query_keys: [...new Set([...url.searchParams.keys()].map(safeMetadataName))].sort(),
    };
  } catch {
    return null;
  }
}

export function deriveCompatibilityProbeUrl(mobileServiceUrl: string | null): string | null {
  if (!mobileServiceUrl) return null;
  try {
    const url = new URL(mobileServiceUrl);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    url.search = '';
    url.hash = '';
    const slash = url.pathname.lastIndexOf('/');
    url.pathname = slash >= 0 ? url.pathname.slice(0, slash + 1) : '/';
    return url.toString();
  } catch {
    return null;
  }
}
