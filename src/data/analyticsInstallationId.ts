const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function opaqueInstallationId(randomUuid: string): string {
  return `anon_${randomUuid.replace(/-/g, '').toLowerCase()}`;
}

export function normalizePersistedInstallationId(value: string): string {
  return UUID.test(value) ? opaqueInstallationId(value) : value;
}
