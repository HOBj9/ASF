import { EventEmitter } from 'events';
import type { DashboardEventItem } from '@/lib/types/dashboard-event';

type ZoneEventListener = (event: DashboardEventItem) => void;

class ZoneEventStreamBus {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(0);
  }

  emit(branchId: string, event: DashboardEventItem): void {
    this.emitter.emit(branchId, event);
  }

  subscribe(branchId: string, listener: ZoneEventListener): () => void {
    this.emitter.on(branchId, listener);
    return () => this.emitter.off(branchId, listener);
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __zoneEventStreamBus: ZoneEventStreamBus | undefined;
}

function getBus(): ZoneEventStreamBus {
  const globalStore = globalThis as typeof globalThis & {
    __zoneEventStreamBus?: ZoneEventStreamBus;
  };
  if (!globalStore.__zoneEventStreamBus) {
    globalStore.__zoneEventStreamBus = new ZoneEventStreamBus();
  }
  return globalStore.__zoneEventStreamBus;
}

export function publishZoneEventUpdate(branchId: string, event: DashboardEventItem): void {
  getBus().emit(branchId, event);
}

export function subscribeToZoneEventUpdates(
  branchId: string,
  listener: ZoneEventListener
): () => void {
  return getBus().subscribe(branchId, listener);
}
