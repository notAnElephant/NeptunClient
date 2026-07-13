import * as SecureStore from 'expo-secure-store';
import type { Session } from '@/domain/models';

const SESSION_KEY = 'neptun.session.v1';
const SECRET_KEY = 'neptun.secret.v1';

export interface ProviderSecret { password?: string; accessToken?: string; userName: string }

export async function saveSecureSession(session: Session, secret: ProviderSecret): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session)),
    SecureStore.setItemAsync(SECRET_KEY, JSON.stringify(secret)),
  ]);
}

export async function loadSecureSession(): Promise<{ session: Session; secret: ProviderSecret } | null> {
  const [session, secret] = await Promise.all([SecureStore.getItemAsync(SESSION_KEY), SecureStore.getItemAsync(SECRET_KEY)]);
  if (!session || !secret) return null;
  try { return { session: JSON.parse(session) as Session, secret: JSON.parse(secret) as ProviderSecret }; }
  catch { await clearSecureSession(); return null; }
}

export async function clearSecureSession(): Promise<void> {
  await Promise.all([SecureStore.deleteItemAsync(SESSION_KEY), SecureStore.deleteItemAsync(SECRET_KEY)]);
}
