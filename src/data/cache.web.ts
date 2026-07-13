const VERSION = 1;

type CacheRow = { version: number; savedAt: string; data: unknown };

function storageKey(accountKey: string, key: string): string { return `neptun.cache.${accountKey}.${key}`; }
function readsKey(accountKey: string): string { return `neptun.reads.${accountKey}`; }

export async function writeCache(accountKey: string, key: string, value: unknown): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(storageKey(accountKey, key), JSON.stringify({ version: VERSION, savedAt: new Date().toISOString(), data: value } satisfies CacheRow));
}

export async function readCache<T>(accountKey: string, key: string): Promise<{ data: T; savedAt: string } | null> {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(storageKey(accountKey, key));
  if (!raw) return null;
  try { const row = JSON.parse(raw) as CacheRow; return row.version === VERSION ? { data: row.data as T, savedAt: row.savedAt } : null; } catch { return null; }
}

export async function clearCache(accountKey?: string): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  for (const key of Object.keys(localStorage)) if (key.startsWith('neptun.cache.') || key.startsWith('neptun.reads.')) { if (!accountKey || key.includes(`.${accountKey}`)) localStorage.removeItem(key); }
}

export async function markMessageReadLocally(accountKey: string, messageId: string): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  const reads = await getLocallyReadMessageIds(accountKey); reads.add(messageId); localStorage.setItem(readsKey(accountKey), JSON.stringify([...reads]));
}

export async function getLocallyReadMessageIds(accountKey: string): Promise<Set<string>> {
  if (typeof localStorage === 'undefined') return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(readsKey(accountKey)) ?? '[]') as string[]); } catch { return new Set(); }
}
