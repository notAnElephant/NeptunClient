import type { DiagnosticConsent } from './diagnosticPreferences';
import type { SupportStatus } from './universityAuthRegistry';

export function shouldExposeCompatibilityFailure(
  structural: boolean,
  supportStatus: SupportStatus | undefined,
  consent: DiagnosticConsent,
): boolean {
  return structural && supportStatus !== 'verified' && consent !== 'denied';
}

export function canStartNativeCompatibilityProbe(
  platform: 'android' | 'ios' | 'web' | string,
  consent: DiagnosticConsent,
  probeUrl: string | null | undefined,
): boolean {
  return (platform === 'android' || platform === 'ios') && consent === 'granted' && Boolean(probeUrl);
}
