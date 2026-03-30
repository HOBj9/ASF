import Branch from '@/models/Branch';
import Driver from '@/models/Driver';
import PointCompletion from '@/models/PointCompletion';
import PointVisit from '@/models/PointVisit';
import ZoneEvent, { type ZoneEventType } from '@/models/ZoneEvent';
import { getZoneEventFeedItemById } from '@/lib/services/zone-event-feed.service';
import { publishZoneEventUpdate } from '@/lib/services/zone-event-stream-bus.service';
import { extractNumericZoneId } from '@/lib/utils/athar-point.util';
import { getZonedDateString } from '@/lib/utils/timezone.util';
import type { TrackingProvider } from '@/lib/tracking/types';

type VehicleLike = {
  _id?: unknown;
  driverId?: unknown;
  imei?: string | null;
};

type PointLike = {
  _id?: unknown;
  name?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  zoneId?: string | null;
};

export interface ProcessTrackingZoneTransitionInput {
  branchId: string;
  provider: TrackingProvider;
  type: ZoneEventType;
  eventTimestamp: Date;
  vehicle?: VehicleLike | null;
  point?: PointLike | null;
  zoneId?: string | null;
  imei?: string | null;
  providerEventId?: string | null;
  rawPayload?: Record<string, any> | null;
  eventName?: string | null;
  driverName?: string | null;
}

function normalizeZoneLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = String(value).trim();
  if (!cleaned) return null;
  if (/^\d+$/.test(cleaned)) return `النقطة ${cleaned}`;
  return cleaned;
}

function resolvePointName(point?: PointLike | null, zoneId?: string | null): string {
  return (
    point?.nameAr ||
    point?.nameEn ||
    point?.name ||
    normalizeZoneLabel(zoneId) ||
    'نقطة غير معروفة'
  );
}

async function resolveDriverName(vehicle?: VehicleLike | null, fallback?: string | null): Promise<string | null> {
  if (fallback) return fallback;
  if (!vehicle?.driverId) return null;
  const driver = await Driver.findById(vehicle.driverId).select('name').lean();
  return driver?.name || null;
}

export class TrackingEventProcessorService {
  async processZoneTransition(input: ProcessTrackingZoneTransitionInput) {
    const branchId = String(input.branchId);
    const vehicleId = input.vehicle?._id ? String(input.vehicle._id) : null;
    const pointId = input.point?._id ? String(input.point._id) : null;
    const resolvedZoneId =
      (typeof input.point?.zoneId === 'string' && input.point.zoneId.trim()) ||
      input.zoneId ||
      null;
    const pointName = resolvePointName(input.point, resolvedZoneId);
    const driverName = await resolveDriverName(input.vehicle, input.driverName || null);
    const eventName =
      input.eventName ||
      `${pointName} - ${input.type === 'zone_in' ? 'دخول' : 'خروج'}`;

    const zoneEvent: any = await ZoneEvent.create({
      branchId,
      vehicleId,
      driverId: input.vehicle?.driverId || null,
      pointId,
      zoneId: resolvedZoneId,
      imei: input.imei || input.vehicle?.imei || null,
      provider: input.provider,
      providerEventId: input.providerEventId || null,
      atharEventId: input.provider === 'athar' ? input.providerEventId || null : null,
      name: eventName,
      driverName: driverName || null,
      type: input.type,
      eventTimestamp: input.eventTimestamp,
      rawPayload: input.rawPayload || null,
    });

    if (input.type === 'zone_in' && pointId && vehicleId) {
      await this.handleZoneIn({
        branchId,
        vehicleId,
        pointId,
        zoneId: resolvedZoneId,
        eventTimestamp: input.eventTimestamp,
        zoneEventId: String(zoneEvent._id),
      });
    }

    if (input.type === 'zone_out' && pointId && vehicleId) {
      await this.handleZoneOut({
        branchId,
        vehicleId,
        pointId,
        zoneId: resolvedZoneId,
        imei: input.imei || input.vehicle?.imei || null,
        eventTimestamp: input.eventTimestamp,
        zoneEventId: String(zoneEvent._id),
      });
    }

    const streamItem = await getZoneEventFeedItemById(branchId, String(zoneEvent._id));
    if (streamItem) {
      publishZoneEventUpdate(branchId, streamItem);
    }

    return zoneEvent;
  }

  private async handleZoneIn(input: {
    branchId: string;
    vehicleId: string;
    pointId: string;
    zoneId?: string | null;
    eventTimestamp: Date;
    zoneEventId: string;
  }) {
    const existingVisit = await PointVisit.findOne({
      branchId: input.branchId,
      vehicleId: input.vehicleId,
      pointId: input.pointId,
      status: 'open',
    }).lean();

    if (existingVisit) {
      await ZoneEvent.findByIdAndUpdate(input.zoneEventId, { isRepeatedEntry: true }).exec();
      const durationSeconds = Math.max(
        0,
        Math.floor((input.eventTimestamp.getTime() - new Date(existingVisit.entryTime).getTime()) / 1000)
      );
      await PointVisit.findByIdAndUpdate(existingVisit._id, {
        exitEventId: input.zoneEventId,
        exitTime: input.eventTimestamp,
        durationSeconds,
        status: 'closed',
        visitKind: 'repeated',
      }).exec();
    }

    await PointVisit.create({
      branchId: input.branchId,
      vehicleId: input.vehicleId,
      pointId: input.pointId,
      zoneId: input.zoneId || null,
      entryEventId: input.zoneEventId,
      entryTime: input.eventTimestamp,
      status: 'open',
    });
  }

  private async handleZoneOut(input: {
    branchId: string;
    vehicleId: string;
    pointId: string;
    zoneId?: string | null;
    imei?: string | null;
    eventTimestamp: Date;
    zoneEventId: string;
  }) {
    const openVisit = await PointVisit.findOne({
      branchId: input.branchId,
      vehicleId: input.vehicleId,
      pointId: input.pointId,
      status: 'open',
    })
      .sort({ entryTime: -1 })
      .exec();

    if (openVisit) {
      const durationSeconds = Math.max(
        0,
        Math.floor((input.eventTimestamp.getTime() - openVisit.entryTime.getTime()) / 1000)
      );

      openVisit.exitEventId = input.zoneEventId as any;
      openVisit.exitTime = input.eventTimestamp;
      openVisit.durationSeconds = durationSeconds;
      openVisit.status = 'closed';

      const branch = await Branch.findById(input.branchId).select('timezone').lean();
      const timeZone = branch?.timezone || 'Asia/Damascus';
      const completionDate = getZonedDateString(timeZone, input.eventTimestamp);
      const existingCompletion = await PointCompletion.findOne({
        branchId: input.branchId,
        pointId: input.pointId,
        completionDate,
      }).lean();

      if (!existingCompletion) {
        await PointCompletion.create({
          branchId: input.branchId,
          pointId: input.pointId,
          completionDate,
          pointVisitId: openVisit._id,
          completedAt: input.eventTimestamp,
        });
        openVisit.visitKind = 'first';
      } else {
        openVisit.visitKind = 'repeated';
      }

      await openVisit.save();
      return;
    }

    const zoneIdsToMatch = [
      input.zoneId,
      extractNumericZoneId(input.zoneId || null),
    ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);

    const matchingEntry = await ZoneEvent.findOne({
      branchId: input.branchId,
      $or: [{ vehicleId: input.vehicleId }, { imei: input.imei || null }],
      type: 'zone_in',
      zoneId: { $in: zoneIdsToMatch },
      eventTimestamp: { $lt: input.eventTimestamp },
      _id: { $ne: input.zoneEventId },
    })
      .sort({ eventTimestamp: -1 })
      .lean();

    const alreadyUsed = matchingEntry && (await PointVisit.exists({ entryEventId: matchingEntry._id }));

    if (matchingEntry && !alreadyUsed) {
      const entryTime = matchingEntry.eventTimestamp
        ? new Date(matchingEntry.eventTimestamp)
        : input.eventTimestamp;
      const durationSeconds = Math.max(
        0,
        Math.floor((input.eventTimestamp.getTime() - entryTime.getTime()) / 1000)
      );
      const newVisit = await PointVisit.create({
        branchId: input.branchId,
        vehicleId: input.vehicleId,
        pointId: input.pointId,
        zoneId: input.zoneId || null,
        entryEventId: matchingEntry._id,
        exitEventId: input.zoneEventId,
        entryTime,
        exitTime: input.eventTimestamp,
        durationSeconds,
        status: 'closed',
      });

      const branch = await Branch.findById(input.branchId).select('timezone').lean();
      const timeZone = branch?.timezone || 'Asia/Damascus';
      const completionDate = getZonedDateString(timeZone, input.eventTimestamp);
      const existingCompletion = await PointCompletion.findOne({
        branchId: input.branchId,
        pointId: input.pointId,
        completionDate,
      }).lean();

      if (!existingCompletion) {
        await PointCompletion.create({
          branchId: input.branchId,
          pointId: input.pointId,
          completionDate,
          pointVisitId: newVisit._id,
          completedAt: input.eventTimestamp,
        });
        await PointVisit.findByIdAndUpdate(newVisit._id, { visitKind: 'first' }).exec();
      } else {
        await PointVisit.findByIdAndUpdate(newVisit._id, { visitKind: 'repeated' }).exec();
      }
      return;
    }

    await ZoneEvent.findByIdAndUpdate(input.zoneEventId, { isOrphanExit: true }).exec();
  }
}
