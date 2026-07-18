import type { LoginDiagnosticStage, StructuralFailureReason } from './loginDiagnosticMetadata';

export class ProviderError extends Error {
  constructor(
    public readonly code: 'authentication' | 'connectivity' | 'unsupported-contract' | 'malformed-response' | 'server',
    message: string,
    public readonly status?: number,
    public readonly structuralReason?: StructuralFailureReason,
    public readonly diagnosticStage?: LoginDiagnosticStage,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export function isStructuralProviderError(error: unknown): error is ProviderError & { structuralReason: StructuralFailureReason } {
  return error instanceof ProviderError && error.structuralReason !== undefined;
}

export async function checkedJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    const code = response.status === 401 || response.status === 403 || (response.status >= 300 && response.status < 400) ? 'authentication' : response.status >= 500 ? 'server' : 'unsupported-contract';
    throw new ProviderError(code, `A Neptun szolgáltatás ${response.status} állapotkóddal válaszolt.`, response.status);
  }
  try { return await response.json(); }
  catch { throw new ProviderError('malformed-response', 'A Neptun válasza nem értelmezhető JSON-ként.'); }
}

export async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try { return await fetch(input, init); }
  catch { throw new ProviderError('connectivity', 'A Neptun szolgáltatása nem érhető el.'); }
}
