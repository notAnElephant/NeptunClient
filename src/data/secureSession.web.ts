import type { Session } from '@/domain/models';

const SESSION_KEY = 'neptun.session.v1';
const SECRET_KEY = 'neptun.secret.v1';
export interface ProviderSecret { password?: string; accessToken?: string; userName: string; rememberMe: boolean }

export async function saveSecureSession(session: Session, secret: ProviderSecret): Promise<void> {
  if (typeof sessionStorage === 'undefined') return;
  if (!secret.rememberMe) {
    await clearSecureSession();
    return;
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  sessionStorage.setItem(SECRET_KEY, JSON.stringify(secret));
}

export async function loadSecureSession(): Promise<{ session: Session; secret: ProviderSecret } | null> {
  if (typeof sessionStorage === 'undefined') return null;
  const session = sessionStorage.getItem(SESSION_KEY); const secret = sessionStorage.getItem(SECRET_KEY);
  if (!session || !secret) {
    await clearSecureSession();
    return null;
  }
  try {
    const parsedSecret = JSON.parse(secret) as Partial<ProviderSecret>;
    if (parsedSecret.rememberMe !== true || typeof parsedSecret.userName !== 'string') {
      await clearSecureSession();
      return null;
    }
    return { session: JSON.parse(session) as Session, secret: parsedSecret as ProviderSecret };
  } catch { await clearSecureSession(); return null; }
}

export async function clearSecureSession(): Promise<void> {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SECRET_KEY);
}
