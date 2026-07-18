import * as Crypto from 'expo-crypto';
import type { DiagnosticConsent } from './diagnosticPreferences';
import { normalizePersistedInstallationId, opaqueInstallationId } from './analyticsInstallationId';

const CONSENT_KEY = 'neptun.diagnostic-consent.v1';
const INSTALLATION_ID_KEY = 'neptun.analytics-installation-id.v1';

export async function getDiagnosticConsent(): Promise<DiagnosticConsent> {
  if (typeof localStorage === 'undefined') return 'unknown';
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : 'unknown';
  } catch { return 'unknown'; }
}

export async function setDiagnosticConsent(consent: DiagnosticConsent): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  try {
    if (consent === 'unknown') localStorage.removeItem(CONSENT_KEY);
    else localStorage.setItem(CONSENT_KEY, consent);
  } catch { /* Browser privacy settings may disable persistent storage. */ }
}

export async function getOrCreateAnalyticsInstallationId(): Promise<string> {
  if (typeof localStorage === 'undefined') return opaqueInstallationId(Crypto.randomUUID());
  try {
    const existing = localStorage.getItem(INSTALLATION_ID_KEY);
    if (existing) {
      const normalized = normalizePersistedInstallationId(existing);
      if (normalized !== existing) localStorage.setItem(INSTALLATION_ID_KEY, normalized);
      return normalized;
    }
    const created = opaqueInstallationId(Crypto.randomUUID());
    localStorage.setItem(INSTALLATION_ID_KEY, created);
    return created;
  } catch {
    return opaqueInstallationId(Crypto.randomUUID());
  }
}
