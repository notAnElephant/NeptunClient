import type { Session } from '@/domain/models';

const SESSION_KEY = 'neptun.session.v1';
const SECRET_KEY = 'neptun.secret.v1';
export interface ProviderSecret { password?: string; accessToken?: string; userName: string }

export async function saveSecureSession(session: Session, secret: ProviderSecret): Promise<void> {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  sessionStorage.setItem(SECRET_KEY, JSON.stringify(secret));
}

export async function loadSecureSession(): Promise<{ session: Session; secret: ProviderSecret } | null> {
  if (typeof sessionStorage === 'undefined') return null;
  const session = sessionStorage.getItem(SESSION_KEY); const secret = sessionStorage.getItem(SECRET_KEY);
  if (!session || !secret) return null;
  try { return { session: JSON.parse(session) as Session, secret: JSON.parse(secret) as ProviderSecret }; } catch { await clearSecureSession(); return null; }
}

export async function clearSecureSession(): Promise<void> {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SECRET_KEY);
}
