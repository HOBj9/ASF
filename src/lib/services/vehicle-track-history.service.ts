import connectDB from '@/lib/mongodb';
import { AtharService } from '@/lib/services/athar.service';
import TrackingBinding from '@/models/TrackingBinding';
import TrackingSample from '@/models/TrackingSample';
import Vehicle from '@/models/Vehicle';
import Route from '@/models/Route';
import type { TrackingProvider } from '@/lib/tracking/types';

export type VehicleTrackHistoryPoint = {
  provider: TrackingProvider;
  source: 'tracking_sample' | 'athar_route';
  recordedAt: string;
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  altitude: number | null;
};

export type VehicleTrackHistoryResult = {
  vehicle: {
    id: string;
    name: string;
    plateNumber: string | null;
    provider: TrackingProvider;
    providerLabel: string;
    routeId: string | null;
    routeName: string | null;
    imei: string | null;
    trackingExternalId: string | null;
  };
  summary: {
    pointsCount: number;
    startedAt: string | null;
    endedAt: string | null;
    source: 'tracking_sample' | 'athar_route';
    savedToSystem: boolean;
  };
  points: VehicleTrackHistoryPoint[];
};

type HistoryInput = {
  branchId: string;
  vehicleId: string;
  from: Date;
  to: Date;
  limit?: number;
};

type AtharRoutePoint = {
  recordedAt: Date;
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
};

const MAX_HISTORY_POINTS = 3000;

function getProviderLabel(provider: TrackingProvider): string {
  if (provider === 'mobile_app') return 'GPS الموبايل';
  if (provider === 'traccar') return 'تراكار';
  return 'أثر';
}

function normalizeHistoryLimit(limit?: number): number {
  const numeric = Number(limit || 1000);
  if (!Number.isFinite(numeric)) return 1000;
  return Math.max(1, Math.min(MAX_HISTORY_POINTS, Math.floor(numeric)));
}

function parseAtharRoutePoint(entry: any): AtharRoutePoint | null {
  if (Array.isArray(entry)) {
    const recordedAt = parseAtharRecordedAt(entry[0]);
    const lat = Number(entry[1]);
    const lng = Number(entry[2]);
    if (!recordedAt || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const altitude = Number(entry[3]);
    const heading = Number(entry[4]);
    const speed = Number(entry[5]);

    return {
      recordedAt,
      lat,
      lng,
      altitude: Number.isFinite(altitude) ? altitude : null,
      heading: Number.isFinite(heading) ? heading : null,
      speed: Number.isFinite(speed) ? speed : null,
    };
  }

  if (entry && typeof entry === 'object') {
    const recordedAt = parseAtharRecordedAt(
      entry.dt_tracker ??
        entry.recordedAt ??
        entry.time ??
        entry.datetime ??
        entry.date
    );
    const lat = Number(entry.lat ?? entry.latitude);
    const lng = Number(entry.lng ?? entry.longitude);
    if (!recordedAt || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const altitude = Number(entry.altitude);
    const heading = Number(entry.angle ?? entry.heading ?? entry.course);
    const speed = Number(entry.speed);

    return {
      recordedAt,
      lat,
      lng,
      altitude: Number.isFinite(altitude) ? altitude : null,
      heading: Number.isFinite(heading) ? heading : null,
      speed: Number.isFinite(speed) ? speed : null,
    };
  }

  return null;
}

function parseAtharRecordedAt(value: unknown): Date | null {
  if (!value) return null;
  const normalized = String(value).trim().replace(' ', 'T');
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export class VehicleTrackHistoryService {
  async getVehicleHistory(input: HistoryInput): Promise<VehicleTrackHistoryResult> {
    await connectDB();

    const limit = normalizeHistoryLimit(input.limit);
    const vehicle = await Vehicle.findOne({
      _id: input.vehicleId,
      branchId: input.branchId,
      isActive: true,
    })
      .select('name plateNumber imei trackingProvider routeId branchId')
      .lean();

    if (!vehicle) {
      throw new Error('المركبة غير موجودة أو غير مفعلة');
    }

    const routeId = vehicle.routeId ? String(vehicle.routeId) : null;
    const route = routeId
      ? await Route.findById(routeId).select('name').lean()
      : null;
    const provider = (vehicle.trackingProvider || 'athar') as TrackingProvider;

    if (provider === 'athar') {
      const atharHistory = await this.getAtharVehicleHistory({
        branchId: input.branchId,
        vehicle,
        from: input.from,
        to: input.to,
        limit,
      });

      if (atharHistory) {
        return {
          vehicle: {
            id: String(vehicle._id),
            name: vehicle.name || `مركبة ${String(vehicle._id).slice(-4)}`,
            plateNumber: vehicle.plateNumber || null,
            provider,
            providerLabel: getProviderLabel(provider),
            routeId,
            routeName: route?.name || null,
            imei: vehicle.imei ? String(vehicle.imei) : null,
            trackingExternalId: vehicle.imei ? String(vehicle.imei) : null,
          },
          summary: {
            pointsCount: atharHistory.points.length,
            startedAt: atharHistory.points[0]?.recordedAt || null,
            endedAt: atharHistory.points[atharHistory.points.length - 1]?.recordedAt || null,
            source: 'athar_route',
            savedToSystem: atharHistory.savedToSystem,
          },
          points: atharHistory.points,
        };
      }
    }

    const sampleHistory = await this.getTrackingSampleHistory({
      vehicleId: String(vehicle._id),
      from: input.from,
      to: input.to,
      limit,
    });

    return {
      vehicle: {
        id: String(vehicle._id),
        name: vehicle.name || `مركبة ${String(vehicle._id).slice(-4)}`,
        plateNumber: vehicle.plateNumber || null,
        provider,
        providerLabel: getProviderLabel(provider),
        routeId,
        routeName: route?.name || null,
        imei: vehicle.imei ? String(vehicle.imei) : null,
        trackingExternalId: sampleHistory.trackingExternalId,
      },
      summary: {
        pointsCount: sampleHistory.points.length,
        startedAt: sampleHistory.points[0]?.recordedAt || null,
        endedAt: sampleHistory.points[sampleHistory.points.length - 1]?.recordedAt || null,
        source: 'tracking_sample',
        savedToSystem: true,
      },
      points: sampleHistory.points,
    };
  }

  private async getTrackingSampleHistory(input: {
    vehicleId: string;
    from: Date;
    to: Date;
    limit: number;
  }): Promise<{
    points: VehicleTrackHistoryPoint[];
    trackingExternalId: string | null;
  }> {
    const samples = await TrackingSample.find({
      vehicleId: input.vehicleId,
      recordedAt: {
        $gte: input.from,
        $lte: input.to,
      },
    })
      .sort({ recordedAt: 1 })
      .limit(input.limit)
      .lean();

    const activeBinding = await TrackingBinding.findOne({
      vehicleId: input.vehicleId,
      isActive: true,
      isPrimary: true,
    })
      .select('externalId')
      .lean();

    return {
      trackingExternalId: activeBinding?.externalId ? String(activeBinding.externalId) : null,
      points: samples.map((sample) => ({
        provider: sample.provider,
        source: 'tracking_sample',
        recordedAt: new Date(sample.recordedAt).toISOString(),
        lat: Number(sample.lat),
        lng: Number(sample.lng),
        speed: sample.speed != null ? Number(sample.speed) : null,
        heading: sample.heading != null ? Number(sample.heading) : null,
        accuracy: sample.accuracy != null ? Number(sample.accuracy) : null,
        altitude: sample.altitude != null ? Number(sample.altitude) : null,
      })),
    };
  }

  private async getAtharVehicleHistory(input: {
    branchId: string;
    vehicle: any;
    from: Date;
    to: Date;
    limit: number;
  }): Promise<{
    points: VehicleTrackHistoryPoint[];
    savedToSystem: boolean;
  } | null> {
    const imei = String(input.vehicle.imei || '').trim();
    if (!imei) return null;

    const atharService = await AtharService.forBranch(input.branchId);
    const routeEntries = await atharService.getObjectRouteHistory(imei, input.from, input.to);
    const points = routeEntries
      .map((entry) => parseAtharRoutePoint(entry))
      .filter((point): point is AtharRoutePoint => point != null)
      .sort((left, right) => left.recordedAt.getTime() - right.recordedAt.getTime())
      .slice(0, input.limit)
      .map((point) => ({
        provider: 'athar' as const,
        source: 'athar_route' as const,
        recordedAt: point.recordedAt.toISOString(),
        lat: point.lat,
        lng: point.lng,
        speed: point.speed,
        heading: point.heading,
        accuracy: null,
        altitude: point.altitude,
      }));

    if (!points.length) {
      return null;
    }

    let savedToSystem = false;
    try {
      const binding = await this.ensureAtharBinding(input.branchId, input.vehicle, imei);
      await TrackingSample.bulkWrite(
        points.map((point) => ({
          updateOne: {
            filter: {
              bindingId: binding._id,
              recordedAt: new Date(point.recordedAt),
              lat: point.lat,
              lng: point.lng,
            },
            update: {
              $setOnInsert: {
                provider: 'athar',
                vehicleId: input.vehicle._id,
                bindingId: binding._id,
                recordedAt: new Date(point.recordedAt),
                receivedAt: new Date(),
                lat: point.lat,
                lng: point.lng,
                speed: point.speed,
                heading: point.heading,
                accuracy: null,
                altitude: point.altitude,
                rawRefId: null,
              },
            },
            upsert: true,
          },
        })),
        { ordered: false }
      );
      savedToSystem = true;
    } catch {
      savedToSystem = false;
    }

    return {
      points,
      savedToSystem,
    };
  }

  private async ensureAtharBinding(branchId: string, vehicle: any, imei: string) {
    const provider = 'athar' as const;
    const shouldBePrimary = (vehicle.trackingProvider || 'athar') === 'athar';

    return TrackingBinding.findOneAndUpdate(
      {
        branchId,
        provider,
        externalId: imei,
      },
      {
        $set: {
          vehicleId: vehicle._id,
          capabilities: ['live_location', 'route_history'],
          isActive: true,
          isPrimary: shouldBePrimary,
          metadata: {
            source: 'athar_history_sync',
          },
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    )
      .select('_id vehicleId branchId externalId provider')
      .lean();
  }
}
