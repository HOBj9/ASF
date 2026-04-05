export const trackingProviders = ['athar', 'mobile_app', 'traccar'] as const;
export type TrackingProvider = (typeof trackingProviders)[number];

export const zoneEventProviders = ['athar', 'mobile_app'] as const;
export type ZoneEventProvider = (typeof zoneEventProviders)[number];

export const trackingIngressStatuses = [
  'received',
  'processed',
  'duplicate',
  'ignored_late',
  'rejected',
  'error',
] as const;
export type TrackingIngressStatus = (typeof trackingIngressStatuses)[number];

export const trackingConnectivityStatuses = ['moving', 'stopped', 'offline'] as const;
export type TrackingConnectivityStatus = (typeof trackingConnectivityStatuses)[number];

export const trackingEventDefinitionSyncStatuses = [
  'not_required',
  'pending',
  'synced',
  'failed',
] as const;
export type TrackingEventDefinitionSyncStatus =
  (typeof trackingEventDefinitionSyncStatuses)[number];

export const trackingEventDefinitionScopes = ['organization', 'branch'] as const;
export type TrackingEventDefinitionScope =
  (typeof trackingEventDefinitionScopes)[number];
