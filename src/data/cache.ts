import * as SQLite from 'expo-sqlite';

const VERSION = 1;
let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;

async function database(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= SQLite.openDatabaseAsync('neptun-cache.db').then(async (db) => {
    await db.execAsync('CREATE TABLE IF NOT EXISTS cache (account_key TEXT NOT NULL, cache_key TEXT NOT NULL, version INTEGER NOT NULL, saved_at TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(account_key, cache_key)); CREATE TABLE IF NOT EXISTS local_message_reads (account_key TEXT NOT NULL, message_id TEXT NOT NULL, read_at TEXT NOT NULL, PRIMARY KEY(account_key, message_id));');
    return db;
  });
  return databasePromise;
}

export async function writeCache(accountKey: string, key: string, value: unknown): Promise<void> {
  const db = await database();
  await db.runAsync('INSERT OR REPLACE INTO cache(account_key, cache_key, version, saved_at, payload) VALUES (?, ?, ?, ?, ?)', accountKey, key, VERSION, new Date().toISOString(), JSON.stringify(value));
}

export async function readCache<T>(accountKey: string, key: string): Promise<{ data: T; savedAt: string } | null> {
  const db = await database();
  const row = await db.getFirstAsync<{ payload: string; saved_at: string; version: number }>('SELECT payload, saved_at, version FROM cache WHERE account_key = ? AND cache_key = ?', accountKey, key);
  if (!row || row.version !== VERSION) return null;
  try { return { data: JSON.parse(row.payload) as T, savedAt: row.saved_at }; } catch { return null; }
}

export async function clearCache(accountKey?: string): Promise<void> {
  const db = await database();
  if (accountKey) { await db.runAsync('DELETE FROM cache WHERE account_key = ?', accountKey); await db.runAsync('DELETE FROM local_message_reads WHERE account_key = ?', accountKey); }
  else await db.execAsync('DELETE FROM cache; DELETE FROM local_message_reads;');
}

export async function markMessageReadLocally(accountKey: string, messageId: string): Promise<void> {
  const db = await database();
  await db.runAsync('INSERT OR REPLACE INTO local_message_reads(account_key, message_id, read_at) VALUES (?, ?, ?)', accountKey, messageId, new Date().toISOString());
}

export async function getLocallyReadMessageIds(accountKey: string): Promise<Set<string>> {
  const db = await database();
  const rows = await db.getAllAsync<{ message_id: string }>('SELECT message_id FROM local_message_reads WHERE account_key = ?', accountKey);
  return new Set(rows.map((row) => row.message_id));
}
