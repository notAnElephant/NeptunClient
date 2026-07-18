import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { normalizePersistedInstallationId, opaqueInstallationId } from './analyticsInstallationId';

export type DiagnosticConsent = 'unknown' | 'granted' | 'denied';

const CONSENT_KEY = 'neptun.diagnostic-consent.v1';
const INSTALLATION_ID_KEY = 'neptun.analytics-installation-id.v1';
const STORE_OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export async function getDiagnosticConsent(): Promise<DiagnosticConsent> {
  const value = await SecureStore.getItemAsync(CONSENT_KEY, STORE_OPTIONS);
  return value === 'granted' || value === 'denied' ? value : 'unknown';
}

export async function setDiagnosticConsent(consent: DiagnosticConsent): Promise<void> {
  if (consent === 'unknown') await SecureStore.deleteItemAsync(CONSENT_KEY, STORE_OPTIONS);
  else await SecureStore.setItemAsync(CONSENT_KEY, consent, STORE_OPTIONS);
}

export async function getOrCreateAnalyticsInstallationId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(INSTALLATION_ID_KEY, STORE_OPTIONS);
  if (existing) {
    const normalized = normalizePersistedInstallationId(existing);
    if (normalized !== existing) await SecureStore.setItemAsync(INSTALLATION_ID_KEY, normalized, STORE_OPTIONS);
    return normalized;
  }
  const created = opaqueInstallationId(Crypto.randomUUID());
  await SecureStore.setItemAsync(INSTALLATION_ID_KEY, created, STORE_OPTIONS);
  return created;
}
