import * as SQLite from 'expo-sqlite';

let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;

async function database(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= SQLite.openDatabaseAsync('neptun-preferences.db').then(async (db) => {
    await db.execAsync('CREATE TABLE IF NOT EXISTS account_preferences (account_key TEXT PRIMARY KEY NOT NULL, nickname TEXT);');
    return db;
  });
  return databasePromise;
}

export async function getPreferredNickname(accountKey: string): Promise<string | null> {
  const db = await database();
  const row = await db.getFirstAsync<{ nickname: string | null }>('SELECT nickname FROM account_preferences WHERE account_key = ?', accountKey);
  return row?.nickname?.trim() || null;
}

export async function setPreferredNickname(accountKey: string, nickname: string | null): Promise<void> {
  const db = await database();
  const normalized = nickname?.trim() || null;
  if (normalized) await db.runAsync('INSERT OR REPLACE INTO account_preferences(account_key, nickname) VALUES (?, ?)', accountKey, normalized);
  else await db.runAsync('DELETE FROM account_preferences WHERE account_key = ?', accountKey);
}
