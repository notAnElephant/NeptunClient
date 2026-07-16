import * as FileSystem from 'expo-file-system/legacy';

const DIAGNOSTIC_FILE = 'elte-login-diagnostics.jsonl';
let writeQueue = Promise.resolve();

function diagnosticUri(): string | null {
  return FileSystem.documentDirectory ? `${FileSystem.documentDirectory}${DIAGNOSTIC_FILE}` : null;
}

function sanitizedNavigation(rawUrl: string): Record<string, unknown> {
  try {
    const url = new URL(rawUrl);
    return {
      protocol: url.protocol,
      host: url.hostname,
      path: url.pathname,
      queryKeys: [...new Set(Array.from(url.searchParams.keys()))].sort(),
    };
  } catch {
    return { malformedUrl: true };
  }
}

async function append(entry: Record<string, unknown>): Promise<void> {
  const uri = diagnosticUri();
  if (!uri) return;
  const line = `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`;
  const info = await FileSystem.getInfoAsync(uri);
  const existing = info.exists ? await FileSystem.readAsStringAsync(uri) : '';
  await FileSystem.writeAsStringAsync(uri, `${existing}${line}`);
}

export function beginElteLoginDiagnostics(): void {
  writeQueue = writeQueue.then(async () => {
    const uri = diagnosticUri();
    if (!uri) return;
    await FileSystem.deleteAsync(uri, { idempotent: true });
    await append({ event: 'flow_started' });
  }).catch(() => undefined);
}

export function recordElteLoginNavigation(event: string, rawUrl: string): void {
  recordElteLoginDiagnostic(event, sanitizedNavigation(rawUrl));
}

export function recordElteLoginDiagnostic(event: string, details: Record<string, unknown> = {}): void {
  writeQueue = writeQueue.then(() => append({ event, ...details })).catch(() => undefined);
}
