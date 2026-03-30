import type { TrackingConnectivityStatus } from '@/lib/tracking/types';

const OFFLINE_AFTER_MS = 120 * 1000;

export function resolveTrackingConnectivityStatus(
  speed?: number | null,
  lastReceivedAt?: Date | null,
  now: Date = new Date()
): TrackingConnectivityStatus {
  if (!lastReceivedAt) return 'offline';
  if (now.getTime() - lastReceivedAt.getTime() > OFFLINE_AFTER_MS) {
    return 'offline';
  }
  return Number(speed || 0) > 0 ? 'moving' : 'stopped';
}

export function isTrackingStateOffline(lastReceivedAt?: Date | null, now: Date = new Date()): boolean {
  if (!lastReceivedAt) return true;
  return now.getTime() - lastReceivedAt.getTime() > OFFLINE_AFTER_MS;
}
