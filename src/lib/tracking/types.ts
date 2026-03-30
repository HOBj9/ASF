export const trackingProviders = ['athar', 'mobile_app', 'traccar'] as const;
export type TrackingProvider = (typeof trackingProviders)[number];

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
