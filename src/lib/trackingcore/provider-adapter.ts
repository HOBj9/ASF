import type { TrackingProvider } from '@/lib/tracking/types';

export interface NormalizedTrackingZoneEvent {
  provider: TrackingProvider;
  providerEventId?: string | null;
  type: 'zone_in' | 'zone_out';
  branchId: string;
  vehicleId?: string | null;
  pointId?: string | null;
  zoneId?: string | null;
  imei?: string | null;
  eventTimestamp: Date;
  rawPayload?: Record<string, any> | null;
}

export interface ProviderAdapter<TPayload> {
  provider: TrackingProvider;
  normalize(payload: TPayload): Promise<NormalizedTrackingZoneEvent | null>;
}
