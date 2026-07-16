export function beginElteLoginDiagnostics(): void {}

export function recordElteLoginNavigation(_event: string, _rawUrl: string): void {}

export function recordElteLoginDiagnostic(_event: string, _details: Record<string, unknown> = {}): void {}
