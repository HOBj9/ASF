import connectDB from '@/lib/mongodb';
import Point from '@/models/Point';
import TrackingBinding from '@/models/TrackingBinding';
import TrackingIngressMessage from '@/models/TrackingIngressMessage';
import TrackingSample from '@/models/TrackingSample';
import TrackingVehicleState from '@/models/TrackingVehicleState';
import User from '@/models/User';
import Vehicle from '@/models/Vehicle';
import { invalidateVehicleSnapshot } from '@/lib/live/branch-live-snapshot-cache';
import { hashTrackingToken, generateTrackingToken } from '@/lib/trackingcore/mobile-token';
import { distanceMeters } from '@/lib/trackingcore/geofence';
import { resolveTrackingConnectivityStatus } from '@/lib/trackingcore/connectivity';
import { TrackingEventProcessorService } from '@/lib/services/tracking-event-processor.service';

const MAX_BATCH_SAMPLES = 300;

export interface MobileTrackingActivateInput {
  userId: string;
  deviceId?: string | null;
  deviceName?: string | null;
  platform?: string | null;
  appVersion?: string | null;
}

export interface MobileTrackingSampleInput {
  recordedAt: string;
  lat: number;
  lng: number;
  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;
  altitude?: number | null;
}

export interface MobileTrackingBatchInput {
  batchId: string;
  sentAt?: string | null;
  samples: MobileTrackingSampleInput[];
}

type PointShape = {
  _id: string;
  name?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  zoneId?: string | null;
  lat: number;
  lng: number;
  radiusMeters: number;
};

function normalizeExternalId(userId: string, deviceId?: string | null): string {
  const normalizedDeviceId = typeof deviceId === 'string' ? deviceId.trim() : '';
  return normalizedDeviceId || `line-supervisor:${userId}`;
}

function parseSampleRecordedAt(recordedAt: string): Date {
  const parsed = new Date(recordedAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Sample recordedAt is invalid');
  }
  return parsed;
}

function normalizeNumeric(value: unknown, fieldName: string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`Field ${fieldName} is invalid`);
  }
  return numeric;
}

function ensureValidBatch(input: MobileTrackingBatchInput): MobileTrackingBatchInput {
  if (!input.batchId || !String(input.batchId).trim()) {
    throw new Error('batchId is required');
  }
  if (!Array.isArray(input.samples) || input.samples.length === 0) {
    throw new Error('samples are required');
  }
  if (input.samples.length > MAX_BATCH_SAMPLES) {
    throw new Error(`The maximum batch size is ${MAX_BATCH_SAMPLES} samples`);
  }
  return input;
}

export class MobileTrackingService {
  private readonly eventProcessor = new TrackingEventProcessorService();

  async activate(input: MobileTrackingActivateInput) {
    await connectDB();

    const user = await User.findById(input.userId)
      .select('branchId trackingVehicleId isActive')
      .lean();

    if (!user || user.isActive === false) {
      throw new Error('User is not eligible for activation');
    }
    if (!user.branchId) {
      throw new Error('No branch is assigned to this user');
    }
    if (!user.trackingVehicleId) {
      throw new Error('A vehicle must be assigned to the line supervisor before activation');
    }

    const branchId = String(user.branchId);
    const vehicleId = String(user.trackingVehicleId);
    const vehicle = await Vehicle.findOne({ _id: vehicleId, branchId, isActive: true }).lean();
    if (!vehicle) {
      throw new Error('Assigned vehicle does not exist or is inactive');
    }

    const token = generateTrackingToken();
    const tokenHash = hashTrackingToken(token);
    const externalId = normalizeExternalId(input.userId, input.deviceId);

    await TrackingBinding.updateMany(
      {
        provider: 'mobile_app',
        isActive: true,
        $or: [{ userId: input.userId }, { vehicleId }],
      },
      {
        $set: {
          isActive: false,
          isPrimary: false,
        },
      }
    ).exec();

    await TrackingBinding.updateMany(
      { vehicleId },
      {
        $set: {
          isPrimary: false,
        },
      }
    ).exec();

    const binding = await TrackingBinding.findOneAndUpdate(
      {
        branchId,
        provider: 'mobile_app',
        externalId,
      },
      {
        $set: {
          vehicleId,
          userId: input.userId,
          capabilities: ['gps_batch_ingest'],
          isPrimary: true,
          isActive: true,
          tokenHash,
          metadata: {
            deviceId: input.deviceId || null,
            deviceName: input.deviceName || null,
            platform: input.platform || null,
            appVersion: input.appVersion || null,
            activatedAt: new Date(),
          },
          lastSeenAt: null,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    await Vehicle.findByIdAndUpdate(vehicleId, {
      trackingProvider: 'mobile_app',
    }).exec();

    if (binding?._id) {
      await TrackingVehicleState.findOneAndUpdate(
        { vehicleId },
        {
          $set: {
            branchId,
            vehicleId,
            bindingId: binding._id,
            provider: 'mobile_app',
            connectivityStatus: 'offline',
          },
          $setOnInsert: {
            insidePointIds: [],
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      ).exec();
    }

    return {
      trackingToken: token,
      binding: binding
        ? {
            _id: String(binding._id),
            branchId: String(binding.branchId),
            vehicleId: String(binding.vehicleId),
            provider: binding.provider,
            externalId: binding.externalId || null,
            userId: binding.userId ? String(binding.userId) : null,
            capabilities: Array.isArray(binding.capabilities) ? binding.capabilities : [],
            isPrimary: Boolean(binding.isPrimary),
            isActive: Boolean(binding.isActive),
            lastSeenAt: binding.lastSeenAt || null,
            metadata: binding.metadata || null,
            createdAt: binding.createdAt || null,
            updatedAt: binding.updatedAt || null,
          }
        : null,
      vehicle: {
        _id: String(vehicle._id),
        name: vehicle.name,
        plateNumber: vehicle.plateNumber || null,
        trackingProvider: 'mobile_app',
      },
    };
  }

  async ingestByToken(token: string, payload: MobileTrackingBatchInput) {
    await connectDB();

    const normalizedToken = String(token || '').trim();
    if (!normalizedToken) {
      const error: any = new Error('Tracking token is missing');
      error.status = 401;
      throw error;
    }

    ensureValidBatch(payload);

    const tokenHash = hashTrackingToken(normalizedToken);
    const binding = await TrackingBinding.findOne({
      provider: 'mobile_app',
      tokenHash,
      isActive: true,
    }).lean();

    if (!binding) {
      const error: any = new Error('Tracking token is invalid');
      error.status = 401;
      throw error;
    }

    const providerMessageId = String(payload.batchId).trim();
    const receivedAt = new Date();

    let ingress: any;
    try {
      ingress = await TrackingIngressMessage.create({
        provider: 'mobile_app',
        branchId: binding.branchId,
        vehicleId: binding.vehicleId,
        bindingId: binding._id,
        providerMessageId,
        rawPayload: payload,
        receivedAt,
        status: 'received',
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        const duplicateRecord = await TrackingIngressMessage.findOne({
          provider: 'mobile_app',
          providerMessageId,
        })
          .select('_id status')
          .lean();
        return {
          success: true,
          duplicate: true,
          ingressId: duplicateRecord?._id ? String(duplicateRecord._id) : null,
        };
      }
      throw error;
    }

    try {
      const vehicle = await Vehicle.findOne({
        _id: binding.vehicleId,
        branchId: binding.branchId,
        isActive: true,
      }).lean();

      if (!vehicle) {
        await this.updateIngressStatus(ingress._id, 'rejected', 'Vehicle does not exist or is inactive');
        throw new Error('Vehicle does not exist or is inactive');
      }

      if ((vehicle.trackingProvider || 'athar') !== 'mobile_app') {
        await this.updateIngressStatus(ingress._id, 'rejected', 'Vehicle is not configured for mobile_app tracking');
        throw new Error('Vehicle is not configured for mobile_app tracking');
      }

      const points = await Point.find({
        branchId: binding.branchId,
        isActive: true,
      })
        .select('_id name nameAr nameEn zoneId lat lng radiusMeters')
        .lean();

      const vehicleId = String(binding.vehicleId);
      const branchId = String(binding.branchId);
      const stateDoc = await TrackingVehicleState.findOne({ vehicleId }).lean();
      let currentInsidePointIds = new Set(
        (stateDoc?.insidePointIds || []).map((value: any) => String(value))
      );
      let lastProcessedAt = stateDoc?.lastProcessedAt ? new Date(stateDoc.lastProcessedAt) : null;
      let lastRecordedAt = stateDoc?.lastRecordedAt ? new Date(stateDoc.lastRecordedAt) : null;
      let lastLocation = stateDoc?.lastLocation || null;
      let lastSpeed = stateDoc?.speed ?? 0;
      let lastHeading = stateDoc?.heading ?? 0;
      let lastAccuracy = stateDoc?.accuracy ?? null;
      let acceptedSamples = 0;
      let lateSamples = 0;

      const normalizedSamples = payload.samples
        .map((sample) => ({
          recordedAt: parseSampleRecordedAt(sample.recordedAt),
          lat: normalizeNumeric(sample.lat, 'lat'),
          lng: normalizeNumeric(sample.lng, 'lng'),
          speed: sample.speed != null ? Number(sample.speed) : null,
          heading: sample.heading != null ? Number(sample.heading) : null,
          accuracy: sample.accuracy != null ? Number(sample.accuracy) : null,
          altitude: sample.altitude != null ? Number(sample.altitude) : null,
        }))
        .sort((left, right) => left.recordedAt.getTime() - right.recordedAt.getTime());

      for (const sample of normalizedSamples) {
        await TrackingSample.updateOne(
          {
            bindingId: binding._id,
            recordedAt: sample.recordedAt,
            lat: sample.lat,
            lng: sample.lng,
          },
          {
            $setOnInsert: {
              provider: 'mobile_app',
              vehicleId,
              bindingId: binding._id,
              recordedAt: sample.recordedAt,
              receivedAt,
              lat: sample.lat,
              lng: sample.lng,
              speed: sample.speed,
              heading: sample.heading,
              accuracy: sample.accuracy,
              altitude: sample.altitude,
              rawRefId: ingress._id,
            },
          },
          { upsert: true }
        ).exec();

        if (lastProcessedAt && sample.recordedAt.getTime() <= lastProcessedAt.getTime()) {
          lateSamples += 1;
          continue;
        }

        currentInsidePointIds = await this.processSampleTransitions({
          branchId,
          vehicle,
          points: points as any[],
          sample,
          currentInsidePointIds,
          ingressId: String(ingress._id),
        });

        acceptedSamples += 1;
        lastProcessedAt = sample.recordedAt;
        lastRecordedAt = sample.recordedAt;
        lastLocation = {
          lat: sample.lat,
          lng: sample.lng,
        };
        lastSpeed = sample.speed ?? 0;
        lastHeading = sample.heading ?? 0;
        lastAccuracy = sample.accuracy ?? null;
      }

      await TrackingBinding.findByIdAndUpdate(binding._id, {
        lastSeenAt: receivedAt,
      }).exec();

      await TrackingVehicleState.findOneAndUpdate(
        { vehicleId },
        {
          $set: {
            branchId,
            vehicleId,
            bindingId: binding._id,
            provider: 'mobile_app',
            lastProcessedAt: lastProcessedAt || stateDoc?.lastProcessedAt || null,
            lastRecordedAt: lastRecordedAt || stateDoc?.lastRecordedAt || null,
            lastReceivedAt: acceptedSamples > 0 ? receivedAt : stateDoc?.lastReceivedAt || null,
            lastLocation: lastLocation || stateDoc?.lastLocation || null,
            speed: lastSpeed,
            heading: lastHeading,
            accuracy: lastAccuracy,
            insidePointIds: Array.from(currentInsidePointIds),
            connectivityStatus: resolveTrackingConnectivityStatus(
              lastSpeed,
              acceptedSamples > 0 ? receivedAt : stateDoc?.lastReceivedAt || null
            ),
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      ).exec();

      invalidateVehicleSnapshot(branchId);

      if (acceptedSamples === 0 && lateSamples > 0) {
        await this.updateIngressStatus(ingress._id, 'ignored_late', null);
      } else {
        await this.updateIngressStatus(ingress._id, 'processed', null);
      }

      return {
        success: true,
        duplicate: false,
        ingressId: String(ingress._id),
        acceptedSamples,
        lateSamples,
      };
    } catch (error: any) {
      await this.updateIngressStatus(ingress._id, 'error', error?.message || 'internal error');
      throw error;
    }
  }

  async revokeBinding(bindingId: string) {
    await connectDB();
    const binding = await TrackingBinding.findById(bindingId).lean();
    if (!binding) {
      throw new Error('Tracking binding not found');
    }

    await TrackingBinding.findByIdAndUpdate(bindingId, {
      isActive: false,
      isPrimary: false,
      tokenHash: null,
    }).exec();

    await TrackingVehicleState.findOneAndUpdate(
      {
        vehicleId: binding.vehicleId,
        bindingId: binding._id,
      },
      {
        $set: {
          connectivityStatus: 'offline',
        },
      }
    ).exec();

    invalidateVehicleSnapshot(String(binding.branchId));

    return { success: true };
  }

  private async updateIngressStatus(
    ingressId: string,
    status: 'processed' | 'ignored_late' | 'rejected' | 'error',
    errorMessage: string | null
  ) {
    await TrackingIngressMessage.findByIdAndUpdate(ingressId, {
      status,
      processedAt: new Date(),
      errorMessage,
    }).exec();
  }

  private async processSampleTransitions(input: {
    branchId: string;
    vehicle: any;
    points: PointShape[];
    sample: {
      recordedAt: Date;
      lat: number;
      lng: number;
      speed?: number | null;
      heading?: number | null;
      accuracy?: number | null;
      altitude?: number | null;
    };
    currentInsidePointIds: Set<string>;
    ingressId: string;
  }): Promise<Set<string>> {
    const nextInsidePointIds = new Set<string>();
    const exitPoints: PointShape[] = [];
    const entryPoints: PointShape[] = [];

    for (const point of input.points) {
      const pointId = String(point._id);
      const distance = distanceMeters(input.sample.lat, input.sample.lng, point.lat, point.lng);
      const currentlyInside = input.currentInsidePointIds.has(pointId);
      const accuracyPadding = Math.max(15, Number(input.sample.accuracy || 0));
      const exitThreshold = Number(point.radiusMeters || 0) + accuracyPadding;

      if (currentlyInside) {
        if (distance <= exitThreshold) {
          nextInsidePointIds.add(pointId);
        } else {
          exitPoints.push(point);
        }
        continue;
      }

      if (distance <= Number(point.radiusMeters || 0)) {
        nextInsidePointIds.add(pointId);
        entryPoints.push(point);
      }
    }

    for (const point of exitPoints) {
      await this.eventProcessor.processZoneTransition({
        branchId: input.branchId,
        provider: 'mobile_app',
        type: 'zone_out',
        eventTimestamp: input.sample.recordedAt,
        vehicle: input.vehicle,
        point,
        zoneId: point.zoneId || String(point._id),
        providerEventId: `${input.ingressId}:${String(point._id)}:out:${input.sample.recordedAt.toISOString()}`,
        rawPayload: {
          source: 'mobile_app',
          pointId: String(point._id),
          recordedAt: input.sample.recordedAt.toISOString(),
          lat: input.sample.lat,
          lng: input.sample.lng,
          speed: input.sample.speed,
          heading: input.sample.heading,
          accuracy: input.sample.accuracy,
          altitude: input.sample.altitude,
        },
      });
    }

    for (const point of entryPoints) {
      await this.eventProcessor.processZoneTransition({
        branchId: input.branchId,
        provider: 'mobile_app',
        type: 'zone_in',
        eventTimestamp: input.sample.recordedAt,
        vehicle: input.vehicle,
        point,
        zoneId: point.zoneId || String(point._id),
        providerEventId: `${input.ingressId}:${String(point._id)}:in:${input.sample.recordedAt.toISOString()}`,
        rawPayload: {
          source: 'mobile_app',
          pointId: String(point._id),
          recordedAt: input.sample.recordedAt.toISOString(),
          lat: input.sample.lat,
          lng: input.sample.lng,
          speed: input.sample.speed,
          heading: input.sample.heading,
          accuracy: input.sample.accuracy,
          altitude: input.sample.altitude,
        },
      });
    }

    return nextInsidePointIds;
  }
}
