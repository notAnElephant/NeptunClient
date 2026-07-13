import type { Institution, Session } from '@/domain/models';
import type { NeptunProvider } from '@/domain/provider';
import type { ProviderSecret } from './secureSession';
import { LegacyMobileProvider } from './providers/legacy';
import { ModernNeptunProvider } from './providers/modern';

export function createProvider(institution: Institution, restored?: { session: Session; secret: ProviderSecret }): NeptunProvider {
  if (institution.provider === 'modern') {
    const provider = new ModernNeptunProvider(institution);
    if (restored) provider.hydrate(restored.session, restored.secret.accessToken);
    return provider;
  }
  const provider = new LegacyMobileProvider(institution);
  if (restored) provider.hydrate(restored.session, restored.secret.password);
  return provider;
}
