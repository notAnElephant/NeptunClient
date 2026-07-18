export const anonymousIdentityProperties = {
  distinctId: 'distinct_id',
  anonymousId: 'anonymous_id',
  deviceId: 'device_id',
  personMode: 'person_mode',
} as const;

type IdentityProperty = typeof anonymousIdentityProperties[keyof typeof anonymousIdentityProperties];

export interface AnonymousIdentityClient {
  getDistinctId(): string;
  reset(): void;
  setPersistedProperty(key: IdentityProperty, value: string | null): void;
}

export function applyAnonymousAnalyticsIdentity(client: AnonymousIdentityClient, installationId: string): void {
  if (client.getDistinctId() === installationId) return;
  client.reset();
  client.setPersistedProperty(anonymousIdentityProperties.distinctId, null);
  client.setPersistedProperty(anonymousIdentityProperties.anonymousId, installationId);
  client.setPersistedProperty(anonymousIdentityProperties.deviceId, installationId);
  client.setPersistedProperty(anonymousIdentityProperties.personMode, 'anonymous');
}
