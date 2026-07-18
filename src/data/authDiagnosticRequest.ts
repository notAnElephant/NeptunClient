import { ProviderError, safeFetch } from './errors';
import {
  createResponseSchemaSignature,
  diagnosticUrlMetadata,
  type LoginDiagnosticStage,
  type StructuralFailureReason,
} from './loginDiagnosticMetadata';
import type { LoginDiagnosticRecorder } from './loginDiagnostics';

interface DiagnosticJsonRequest {
  recorder?: LoginDiagnosticRecorder;
  stage: LoginDiagnosticStage;
  operation: string;
  url: string;
  method: 'GET' | 'POST';
  init?: RequestInit;
}

function elapsed(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}

function structuralError(
  code: 'unsupported-contract' | 'malformed-response',
  message: string,
  reason: StructuralFailureReason,
  status?: number,
  stage?: LoginDiagnosticStage,
): ProviderError {
  return new ProviderError(code, message, status, reason, stage);
}

export async function diagnosticJsonRequest(request: DiagnosticJsonRequest): Promise<unknown> {
  const metadata = diagnosticUrlMetadata(request.url);
  if (!metadata) {
    request.recorder?.record({
      stage: request.stage,
      operation: request.operation,
      method: request.method,
      error_code: 'unsupported-contract',
      reason: 'invalid-url',
    });
    throw structuralError('unsupported-contract', 'Az intézmény szolgáltatási címe hiányzik vagy nem biztonságos.', 'invalid-url', undefined, request.stage);
  }

  request.recorder?.record({
    stage: request.stage,
    operation: request.operation,
    method: request.method,
    ...metadata,
  });

  const startedAt = Date.now();
  let response: Response;
  try {
    response = await safeFetch(request.url, request.init);
  } catch (error) {
    request.recorder?.record({
      stage: request.stage,
      operation: request.operation,
      method: request.method,
      ...metadata,
      duration_ms: elapsed(startedAt),
      error_code: error instanceof ProviderError ? error.code : 'connectivity',
    });
    throw error;
  }

  const contentType = (response.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
  const redirect = response.redirected || (response.status >= 300 && response.status < 400);
  const redirectMetadata = redirect
    ? diagnosticUrlMetadata(response.headers.get('location') ?? response.url, request.url)
    : null;
  const baseResponseStep = {
    stage: request.stage,
    operation: request.operation,
    method: request.method,
    ...metadata,
    status: response.status,
    content_type: contentType || 'unknown',
    duration_ms: elapsed(startedAt),
    ...(redirectMetadata ? {
      redirect_host: redirectMetadata.host,
      redirect_path: redirectMetadata.path,
      redirect_query_keys: redirectMetadata.query_keys,
    } : {}),
  } as const;

  if (redirect) {
    request.recorder?.record({ ...baseResponseStep, error_code: 'authentication', reason: 'login-redirect' });
    throw structuralError('unsupported-contract', 'A Neptun szolgáltatás bejelentkezési oldalra irányított át.', 'login-redirect', response.status, request.stage);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      request.recorder?.record({ ...baseResponseStep, error_code: 'authentication' });
      throw new ProviderError('authentication', 'A megadott belépési adatokkal a Neptun nem engedett be.', response.status);
    }
    if (response.status === 404) {
      request.recorder?.record({ ...baseResponseStep, error_code: 'unsupported-contract', reason: 'missing-endpoint' });
      throw structuralError('unsupported-contract', 'A bejelentkezési végpont nem található.', 'missing-endpoint', response.status, request.stage);
    }
    if (response.status === 405 || response.status === 415) {
      request.recorder?.record({ ...baseResponseStep, error_code: 'unsupported-contract', reason: 'unsupported-status' });
      throw structuralError('unsupported-contract', 'Az intézmény eltérő bejelentkezési szerződést használ.', 'unsupported-status', response.status, request.stage);
    }
    const code = response.status >= 500 ? 'server' : 'server';
    request.recorder?.record({ ...baseResponseStep, error_code: code });
    throw new ProviderError(code, `A Neptun szolgáltatás ${response.status} állapotkóddal válaszolt.`, response.status);
  }

  if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
    request.recorder?.record({ ...baseResponseStep, error_code: 'malformed-response', reason: 'html-response' });
    throw structuralError('malformed-response', 'A Neptun JSON helyett weboldalt küldött.', 'html-response', response.status, request.stage);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    request.recorder?.record({ ...baseResponseStep, error_code: 'malformed-response', reason: 'malformed-json' });
    throw structuralError('malformed-response', 'A Neptun válasza nem értelmezhető JSON-ként.', 'malformed-json', response.status, request.stage);
  }

  request.recorder?.record({
    ...baseResponseStep,
    schema_signature: createResponseSchemaSignature(data),
  });
  return data;
}

export function missingRequiredFields(
  recorder: LoginDiagnosticRecorder | undefined,
  stage: LoginDiagnosticStage,
  operation: string,
  message: string,
): ProviderError {
  recorder?.record({
    stage,
    operation,
    error_code: 'malformed-response',
    reason: 'missing-required-fields',
  });
  return structuralError('malformed-response', message, 'missing-required-fields', undefined, stage);
}
