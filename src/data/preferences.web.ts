function storageKey(accountKey: string): string { return `neptun.preference.nickname.${accountKey}`; }

export async function getPreferredNickname(accountKey: string): Promise<string | null> {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(storageKey(accountKey))?.trim() || null;
}

export async function setPreferredNickname(accountKey: string, nickname: string | null): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  const normalized = nickname?.trim();
  if (normalized) localStorage.setItem(storageKey(accountKey), normalized);
  else localStorage.removeItem(storageKey(accountKey));
}
