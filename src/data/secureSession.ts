import * as SecureStore from 'expo-secure-store';
import type { Session } from '@/domain/models';

const SESSION_KEY = 'neptun.session.v1';
const SECRET_KEY = 'neptun.secret.v1';
const STORE_OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export interface ProviderSecret { password?: string; accessToken?: string; userName: string; rememberMe: boolean }

export async function saveSecureSession(session: Session, secret: ProviderSecret): Promise<void> {
  if (!secret.rememberMe) {
    await clearSecureSession();
    return;
  }
  await Promise.all([
    SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), STORE_OPTIONS),
    SecureStore.setItemAsync(SECRET_KEY, JSON.stringify(secret), STORE_OPTIONS),
  ]);
}

export async function loadSecureSession(): Promise<{ session: Session; secret: ProviderSecret } | null> {
  const [session, secret] = await Promise.all([SecureStore.getItemAsync(SESSION_KEY, STORE_OPTIONS), SecureStore.getItemAsync(SECRET_KEY, STORE_OPTIONS)]);
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
  }
  catch { await clearSecureSession(); return null; }
}

export async function clearSecureSession(): Promise<void> {
  await Promise.all([SecureStore.deleteItemAsync(SESSION_KEY, STORE_OPTIONS), SecureStore.deleteItemAsync(SECRET_KEY, STORE_OPTIONS)]);
}
