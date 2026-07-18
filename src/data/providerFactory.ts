import type { Institution, Session } from '@/domain/models';
import type { NeptunProvider } from '@/domain/provider';
import type { ProviderSecret } from './secureSession';
import { LegacyMobileProvider } from './providers/legacy';
import { ModernNeptunProvider } from './providers/modern';
import type { LoginDiagnosticRecorder } from './loginDiagnostics';
import { resolveInstitutionAuth, type ResolvedInstitutionAuth } from './universityAuthRegistry';

interface ProviderFactoryOptions {
  diagnostics?: LoginDiagnosticRecorder;
  resolvedAuth?: ResolvedInstitutionAuth;
}

export function createProvider(
  institution: Institution,
  restored?: { session: Session; secret: ProviderSecret },
  options: ProviderFactoryOptions = {},
): NeptunProvider {
  const configuredInstitution = (options.resolvedAuth ?? resolveInstitutionAuth(institution)).institution;
  if (configuredInstitution.provider === 'modern') {
    const provider = new ModernNeptunProvider(configuredInstitution, options.diagnostics);
    if (restored) provider.hydrate(restored.session, restored.secret.accessToken);
    return provider;
  }
  const provider = new LegacyMobileProvider(configuredInstitution, options.diagnostics);
  if (restored) provider.hydrate(restored.session, restored.secret.password);
  return provider;
}
