import type { UniversityAuthRegistryPayload } from './universityAuthRegistry';

const CACHE_KEY = 'neptun.university-auth-registry.v1';

export async function readUniversityAuthRegistryCache(): Promise<unknown> {
  if (typeof localStorage === 'undefined') return undefined;
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    return stored ? JSON.parse(stored) : undefined;
  }
  catch { return undefined; }
}

export async function writeUniversityAuthRegistryCache(payload: UniversityAuthRegistryPayload | null): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  try {
    if (payload) localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    else localStorage.removeItem(CACHE_KEY);
  } catch { /* The in-memory/PostHog copy remains available. */ }
}
