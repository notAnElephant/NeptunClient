import { z } from 'zod';
import type { Institution } from '@/domain/models';
import { readUniversityAuthRegistryCache, writeUniversityAuthRegistryCache } from './universityAuthRegistryCache';

export const UNIVERSITY_AUTH_FLAG = 'university-auth-strategies';

export const authStrategySchema = z.enum([
  'legacy-mobile-service',
  'modern-credentials',
  'compiled-external',
]);
export const supportStatusSchema = z.enum(['untested', 'testing', 'verified']);

export type AuthStrategy = z.infer<typeof authStrategySchema>;
export type SupportStatus = z.infer<typeof supportStatusSchema>;

const remoteInstitutionSchema = z.object({
  strategy: authStrategySchema,
  status: supportStatusSchema,
}).strict();

export const universityAuthRegistrySchema = z.object({
  schemaVersion: z.literal(1),
  revision: z.string().min(1).max(80).regex(/^[A-Za-z0-9._-]+$/),
  institutions: z.record(z.string().regex(/^FI\d{5}$/), remoteInstitutionSchema),
}).strict();

export type UniversityAuthRegistryPayload = z.infer<typeof universityAuthRegistrySchema>;

export interface ResolvedInstitutionAuth {
  institution: Institution;
  strategy: AuthStrategy;
  status: SupportStatus;
  revision: string;
  source: 'hardcoded' | 'remote' | 'default';
}

const HARDCODED: Readonly<Record<string, Pick<ResolvedInstitutionAuth, 'strategy' | 'status' | 'revision'>>> = {
  FI23344: { strategy: 'modern-credentials', status: 'verified', revision: 'app-bme-v1' },
  FI80798: { strategy: 'compiled-external', status: 'verified', revision: 'app-elte-v1' },
};

// Every external strategy is implemented in the app and explicitly bound to an institution.
const COMPILED_EXTERNAL_ALLOWLIST = new Set(['FI80798']);

let cachedRegistry: UniversityAuthRegistryPayload | undefined;
let refreshPromise: Promise<void> | undefined;

interface RegistryClient {
  capture(event: string, properties?: Record<string, any>): void;
  getFeatureFlagResult(key: string, options?: { sendEvent?: boolean }): { payload?: unknown } | undefined;
  reloadFeatureFlagsAsync(): Promise<Record<string, boolean | string> | undefined>;
}

let registryClient: RegistryClient | undefined;

export function configureUniversityAuthRegistryClient(client: RegistryClient): void {
  registryClient = client;
}

function reportRejected(reason: string, institutionId?: string): void {
  registryClient?.capture('compatibility_config_rejected', {
    reason,
    ...(institutionId ? { institution_id: institutionId } : {}),
  });
}

export function deriveSameOriginModernApiUrl(mobileServiceUrl: string | null): string | null {
  if (!mobileServiceUrl) return null;
  try {
    const parsed = new URL(mobileServiceUrl);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) return null;
    const marker = /\/MobileService\.svc\/?$/i;
    if (!marker.test(parsed.pathname)) return null;
    parsed.pathname = parsed.pathname.replace(marker, '/api');
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function applyStrategy(institution: Institution, strategy: AuthStrategy): Institution | null {
  if (strategy === 'legacy-mobile-service') {
    return { ...institution, provider: 'legacy', authenticationMode: 'credentials' };
  }
  if (strategy === 'modern-credentials') {
    const url = deriveSameOriginModernApiUrl(institution.url);
    return url ? { ...institution, url, provider: 'modern', authenticationMode: 'credentials' } : null;
  }
  if (!COMPILED_EXTERNAL_ALLOWLIST.has(institution.id)) return null;
  return { ...institution, provider: 'modern', authenticationMode: 'external' };
}

export function parseUniversityAuthRegistry(payload: unknown): UniversityAuthRegistryPayload | null {
  const result = universityAuthRegistrySchema.safeParse(payload);
  return result.success ? result.data : null;
}

export function installUniversityAuthRegistry(payload: unknown): boolean {
  const parsed = parseUniversityAuthRegistry(payload);
  if (!parsed) {
    if (payload !== undefined && payload !== null) reportRejected('invalid_schema');
    return false;
  }
  cachedRegistry = parsed;
  void writeUniversityAuthRegistryCache(parsed);
  return true;
}

export function clearUniversityAuthRegistryForTests(): void {
  cachedRegistry = undefined;
  refreshPromise = undefined;
  registryClient = undefined;
}

export function resolveInstitutionAuth(institution: Institution): ResolvedInstitutionAuth {
  const hardcoded = HARDCODED[institution.id];
  if (hardcoded) {
    return { institution, ...hardcoded, source: 'hardcoded' };
  }

  const assignment = cachedRegistry?.institutions[institution.id];
  if (assignment) {
    const configured = applyStrategy(institution, assignment.strategy);
    if (configured) {
      return {
        institution: configured,
        strategy: assignment.strategy,
        status: assignment.status,
        revision: cachedRegistry!.revision,
        source: 'remote',
      };
    }
    reportRejected(
      assignment.strategy === 'compiled-external' ? 'external_not_allowlisted' : 'invalid_mobile_service_url',
      institution.id,
    );
  }

  return {
    institution: { ...institution, provider: 'legacy', authenticationMode: 'credentials' },
    strategy: 'legacy-mobile-service',
    status: 'untested',
    revision: 'app-default-v1',
    source: 'default',
  };
}

function readPostHogPayload(): unknown {
  return registryClient?.getFeatureFlagResult(UNIVERSITY_AUTH_FLAG, { sendEvent: false })?.payload;
}

export async function loadCachedUniversityAuthRegistry(): Promise<void> {
  const persisted = await readUniversityAuthRegistryCache();
  if (persisted !== undefined) installUniversityAuthRegistry(persisted);
  const postHogPayload = readPostHogPayload();
  if (postHogPayload !== undefined) installUniversityAuthRegistry(postHogPayload);
}

export function refreshUniversityAuthRegistry(): Promise<void> {
  refreshPromise ??= (async () => {
    await loadCachedUniversityAuthRegistry();
    if (!registryClient) return;
    try {
      const refreshedFlags = await registryClient.reloadFeatureFlagsAsync();
      if (!refreshedFlags) return;
      const payload = readPostHogPayload();
      if (payload === undefined) {
        cachedRegistry = undefined;
        await writeUniversityAuthRegistryCache(null);
      } else {
        installUniversityAuthRegistry(payload);
      }
    } catch {
      // The cached registry and compiled defaults remain available while offline.
    }
  })().finally(() => {
    refreshPromise = undefined;
  });
  return refreshPromise;
}

export async function waitForUniversityAuthRegistry(timeoutMs = 2_000): Promise<void> {
  const refresh = refreshPromise;
  if (!refresh) return;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    refresh,
    new Promise<void>((resolve) => { timeout = setTimeout(resolve, timeoutMs); }),
  ]);
  if (timeout) clearTimeout(timeout);
}
