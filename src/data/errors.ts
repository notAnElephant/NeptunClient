export class ProviderError extends Error {
  constructor(public readonly code: 'authentication' | 'connectivity' | 'unsupported-contract' | 'malformed-response' | 'server', message: string, public readonly status?: number) {
    super(message);
    this.name = 'ProviderError';
  }
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
