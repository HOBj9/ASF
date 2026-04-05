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
import { trackingEventDefinitionService } from '@/lib/services/tracking-event-definition.service';
import type { TrackingProvider, ZoneEventProvider } from '@/lib/tracking/types';

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

export interface DirectMobileTrackingBatchInput extends MobileTrackingBatchInput {
  deviceId?: string | null;
  deviceName?: string | null;
  platform?: string | null;
  appVersion?: string | null;
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

type DefinitionPointShape = PointShape & {
  definitionIdsByEventType?: Partial<Record<'zone_in' | 'zone_out', string>>;
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

function normalizeTrackingProvider(provider?: TrackingProvider | null): TrackingProvider {
  return provider === 'mobile_app' || provider === 'traccar' ? provider : 'athar';
}

function normalizeAcceptedProviders(vehicle: {
  trackingProvider?: TrackingProvider | null;
  acceptedTrackingProviders?: TrackingProvider[] | null;
}): TrackingProvider[] {
  if (Array.isArray(vehicle.acceptedTrackingProviders) && vehicle.acceptedTrackingProviders.length > 0) {
    return Array.from(
      new Set(vehicle.acceptedTrackingProviders.map((provider) => normalizeTrackingProvider(provider)))
    );
  }
  return [normalizeTrackingProvider(vehicle.trackingProvider)];
}

function normalizeZoneEventProvider(vehicle: {
  trackingProvider?: TrackingProvider | null;
  zoneEventProvider?: ZoneEventProvider | null;
}): ZoneEventProvider {
  if (vehicle.zoneEventProvider === 'mobile_app' || vehicle.zoneEventProvider === 'athar') {
    return vehicle.zoneEventProvider;
  }
  return normalizeTrackingProvider(vehicle.trackingProvider) === 'mobile_app' ? 'mobile_app' : 'athar';
}

function toDefinitionPointShape(point: any): PointShape | null {
  if (!point?._id || point.lat == null || point.lng == null) {
    return null;
  }
  return {
    _id: String(point._id),
    name: point.name || null,
    nameAr: point.nameAr || null,
    nameEn: point.nameEn || null,
    zoneId: point.zoneId || null,
    lat: Number(point.lat),
    lng: Number(point.lng),
    radiusMeters: Number(point.radiusMeters || 0),
  };
}

export class MobileTrackingService {
  private readonly eventProcessor = new TrackingEventProcessorService();

  private formatBinding(binding: any) {
    if (!binding) return null;

    return {
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
    };
  }

  private formatVehicle(vehicle: any) {
    if (!vehicle) return null;

    const acceptedProviders = normalizeAcceptedProviders(vehicle);

    return {
      _id: String(vehicle._id),
      name: vehicle.name,
      plateNumber: vehicle.plateNumber || null,
      trackingProvider: vehicle.trackingProvider || 'athar',
      acceptedTrackingProviders: acceptedProviders.includes('mobile_app')
        ? acceptedProviders
        : [...acceptedProviders, 'mobile_app'],
      zoneEventProvider: normalizeZoneEventProvider(vehicle),
    };
  }

  private formatVehicleState(state: any) {
    if (!state) return null;

    return {
      bindingId: state.bindingId ? String(state.bindingId) : null,
      provider: state.provider || 'mobile_app',
      connectivityStatus: state.connectivityStatus || 'offline',
      lastProcessedAt: state.lastProcessedAt || null,
      lastRecordedAt: state.lastRecordedAt || null,
      lastReceivedAt: state.lastReceivedAt || null,
      lastLocation: state.lastLocation || null,
      speed: typeof state.speed === 'number' ? state.speed : 0,
      heading: typeof state.heading === 'number' ? state.heading : 0,
      accuracy: state.accuracy ?? null,
      insidePointIds: Array.isArray(state.insidePointIds)
        ? state.insidePointIds.map((value: any) => String(value))
        : [],
    };
  }

  private async ensureDirectBinding(input: MobileTrackingActivateInput) {
    await connectDB();

    const user = await User.findById(input.userId)
      .select('branchId trackingVehicleId isActive')
      .lean();

    if (!user || user.isActive === false) {
      throw new Error('User is not eligible for mobile tracking');
    }
    if (!user.branchId) {
      throw new Error('No branch is assigned to this user');
    }
    if (!user.trackingVehicleId) {
      throw new Error('A vehicle must be assigned to the line supervisor before sending tracking');
    }

    const branchId = String(user.branchId);
    const vehicleId = String(user.trackingVehicleId);
    const vehicle = await Vehicle.findOne({ _id: vehicleId, branchId, isActive: true }).lean();
    if (!vehicle) {
      throw new Error('Assigned vehicle does not exist or is inactive');
    }

    const acceptedProviders = normalizeAcceptedProviders(vehicle);
    if (!acceptedProviders.includes('mobile_app')) {
      await Vehicle.findByIdAndUpdate(vehicleId, {
        $set: {
          acceptedTrackingProviders: [...acceptedProviders, 'mobile_app'],
        },
      }).exec();
    }

    const externalId = normalizeExternalId(input.userId, input.deviceId);
    const metadata = {
      deviceId: input.deviceId || null,
      deviceName: input.deviceName || null,
      platform: input.platform || null,
      appVersion: input.appVersion || null,
      activatedAt: new Date(),
    };

    let binding = await TrackingBinding.findOne({
      provider: 'mobile_app',
      isActive: true,
      $or: [{ userId: input.userId }, { vehicleId }],
    })
      .sort({ isPrimary: -1, updatedAt: -1 })
      .lean();

    if (binding?._id) {
      binding = await TrackingBinding.findByIdAndUpdate(
        binding._id,
        {
          $set: {
            branchId,
            vehicleId,
            userId: input.userId,
            externalId,
            capabilities: ['gps_batch_ingest'],
            isPrimary: true,
            isActive: true,
            metadata,
          },
        },
        {
          new: true,
        }
      ).lean();
    } else {
      binding = await TrackingBinding.findOneAndUpdate(
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
            tokenHash: null,
            metadata,
            lastSeenAt: null,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      ).lean();
    }

    if (binding?._id) {
      await TrackingBinding.updateMany(
        {
          vehicleId,
          _id: { $ne: binding._id },
        },
        {
          $set: {
            isPrimary: false,
          },
        }
      ).exec();

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
      binding,
      vehicle,
    };
  }

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

    const acceptedProviders = normalizeAcceptedProviders(vehicle);
    if (!acceptedProviders.includes('mobile_app')) {
      await Vehicle.findByIdAndUpdate(vehicleId, {
        $set: {
          acceptedTrackingProviders: [...acceptedProviders, 'mobile_app'],
        },
      }).exec();
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
      binding: this.formatBinding(binding),
      vehicle: this.formatVehicle(vehicle),
    };
  }

  async ingestForUser(userId: string, payload: DirectMobileTrackingBatchInput) {
    ensureValidBatch(payload);

    const { binding } = await this.ensureDirectBinding({
      userId,
      deviceId: payload.deviceId || null,
      deviceName: payload.deviceName || null,
      platform: payload.platform || null,
      appVersion: payload.appVersion || null,
    });

    if (!binding) {
      throw new Error('Unable to create or resolve a mobile tracking binding');
    }

    return this.ingestWithBinding(binding, payload);
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

    return this.ingestWithBinding(binding, payload);
  }

  private async ingestWithBinding(binding: any, payload: MobileTrackingBatchInput) {
    ensureValidBatch(payload);

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

      const acceptedProviders = normalizeAcceptedProviders(vehicle);
      if (!acceptedProviders.includes('mobile_app')) {
        await this.updateIngressStatus(
          ingress._id,
          'rejected',
          'Vehicle is not accepting mobile_app tracking'
        );
        throw new Error('Vehicle is not accepting mobile_app tracking');
      }

      const zoneEventProvider = normalizeZoneEventProvider(vehicle);
      const zoneEventsEnabled = zoneEventProvider === 'mobile_app';
      const branchId = String(binding.branchId);
      const vehicleId = String(binding.vehicleId);

      const legacyFallbackEnabled = zoneEventsEnabled
        ? await trackingEventDefinitionService.isLegacyFallbackEnabled(branchId, 'mobile_app')
        : false;
      const activeDefinitions = zoneEventsEnabled
        ? await trackingEventDefinitionService.resolveActiveDefinitionsForVehicleProvider({
            branchId,
            vehicleId,
            providerTarget: 'mobile_app',
          })
        : [];

      const pointsFromDefinitions = new Map<string, DefinitionPointShape>();
      for (const definition of activeDefinitions as any[]) {
        const point = toDefinitionPointShape(definition.pointId);
        if (!point) continue;
        const existingPoint = pointsFromDefinitions.get(point._id);
        if (existingPoint) {
          existingPoint.definitionIdsByEventType = {
            ...existingPoint.definitionIdsByEventType,
            [definition.eventType]: String(definition._id),
          };
          continue;
        }
        pointsFromDefinitions.set(point._id, {
          ...point,
          definitionIdsByEventType: {
            [definition.eventType]: String(definition._id),
          },
        });
      }

      const shouldUseLegacyPoints = zoneEventsEnabled && pointsFromDefinitions.size === 0 && legacyFallbackEnabled;
      const legacyPoints = shouldUseLegacyPoints
        ? ((await Point.find({
            branchId: binding.branchId,
            isActive: true,
          })
            .select('_id name nameAr nameEn zoneId lat lng radiusMeters')
            .lean()) as any[])
            .map((point) => toDefinitionPointShape(point))
            .filter((point): point is PointShape => Boolean(point))
        : [];
      const points: DefinitionPointShape[] = shouldUseLegacyPoints
        ? legacyPoints
        : Array.from(pointsFromDefinitions.values());

      const allowedPointIds = new Set(points.map((point) => String(point._id)));
      const stateDoc = await TrackingVehicleState.findOne({ vehicleId }).lean();
      let currentInsidePointIds = new Set(
        (stateDoc?.insidePointIds || [])
          .map((value: any) => String(value))
          .filter((value: string) => allowedPointIds.has(value))
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

        if (zoneEventsEnabled && points.length > 0) {
          currentInsidePointIds = await this.processSampleTransitions({
            branchId,
            vehicle,
            points,
            sample,
            currentInsidePointIds,
            ingressId: String(ingress._id),
            legacyFallbackEnabled: shouldUseLegacyPoints,
          });
        } else {
          currentInsidePointIds = new Set();
        }

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
        zoneEventsEnabled,
        definitionsCount: activeDefinitions.length,
        legacyFallbackUsed: shouldUseLegacyPoints,
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

  async getStatusForUser(userId: string) {
    await connectDB();

    const user = await User.findById(userId)
      .populate({ path: 'role', select: 'name' })
      .select('name email role organizationId branchId trackingVehicleId isActive')
      .lean();

    if (!user || user.isActive === false) {
      throw new Error('User is not eligible for mobile tracking');
    }

    const branchId = user.branchId ? String(user.branchId) : null;
    const vehicleId = user.trackingVehicleId ? String(user.trackingVehicleId) : null;
    const vehicle = branchId && vehicleId
      ? await Vehicle.findOne({ _id: vehicleId, branchId }).lean()
      : null;
    const binding = vehicleId
      ? await TrackingBinding.findOne({
          provider: 'mobile_app',
          vehicleId,
          userId,
          isActive: true,
        })
          .sort({ isPrimary: -1, updatedAt: -1 })
          .lean()
      : null;
    const state = vehicleId
      ? await TrackingVehicleState.findOne({ vehicleId }).lean()
      : null;

    return {
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role:
          typeof user.role === 'string'
            ? user.role
            : typeof (user.role as any)?.name === 'string'
              ? (user.role as any).name
              : 'line_supervisor',
        organizationId: user.organizationId ? String(user.organizationId) : null,
        branchId,
        trackingVehicleId: vehicleId,
      },
      tracking: {
        canActivate: Boolean(branchId && vehicleId),
        currentBinding: this.formatBinding(binding),
        vehicle: this.formatVehicle(vehicle),
        vehicleState: this.formatVehicleState(state),
      },
    };
  }

  async deactivateForUser(userId: string, deviceId?: string | null) {
    await connectDB();

    const normalizedDeviceId = String(deviceId || '').trim();
    const query: Record<string, unknown> = {
      provider: 'mobile_app',
      userId,
      isActive: true,
    };

    if (normalizedDeviceId) {
      query['metadata.deviceId'] = normalizedDeviceId;
    }

    const bindings = await TrackingBinding.find(query)
      .select('_id branchId vehicleId')
      .lean();

    if (bindings.length === 0) {
      return {
        success: true,
        deactivatedCount: 0,
      };
    }

    const bindingIds = bindings.map((binding) => binding._id);
    const branchIds = Array.from(new Set(bindings.map((binding) => String(binding.branchId))));

    await TrackingBinding.updateMany(
      { _id: { $in: bindingIds } },
      {
        $set: {
          isActive: false,
          isPrimary: false,
          tokenHash: null,
        },
      }
    ).exec();

    await TrackingVehicleState.updateMany(
      {
        bindingId: { $in: bindingIds },
      },
      {
        $set: {
          connectivityStatus: 'offline',
        },
      }
    ).exec();

    branchIds.forEach((branchId) => invalidateVehicleSnapshot(branchId));

    return {
      success: true,
      deactivatedCount: bindings.length,
    };
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
    points: DefinitionPointShape[];
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
    legacyFallbackEnabled: boolean;
  }): Promise<Set<string>> {
    const nextInsidePointIds = new Set<string>();
    const exitPoints: DefinitionPointShape[] = [];
    const entryPoints: DefinitionPointShape[] = [];

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
      const definitionId = input.legacyFallbackEnabled
        ? null
        : point.definitionIdsByEventType?.zone_out || null;
      if (!input.legacyFallbackEnabled && !definitionId) {
        continue;
      }

      await this.eventProcessor.processZoneTransition({
        branchId: input.branchId,
        provider: 'mobile_app',
        type: 'zone_out',
        eventTimestamp: input.sample.recordedAt,
        vehicle: input.vehicle,
        point,
        zoneId: point.zoneId || String(point._id),
        providerEventId: `${input.ingressId}:${String(point._id)}:out:${input.sample.recordedAt.toISOString()}`,
        definitionId,
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
      const definitionId = input.legacyFallbackEnabled
        ? null
        : point.definitionIdsByEventType?.zone_in || null;
      if (!input.legacyFallbackEnabled && !definitionId) {
        continue;
      }

      await this.eventProcessor.processZoneTransition({
        branchId: input.branchId,
        provider: 'mobile_app',
        type: 'zone_in',
        eventTimestamp: input.sample.recordedAt,
        vehicle: input.vehicle,
        point,
        zoneId: point.zoneId || String(point._id),
        providerEventId: `${input.ingressId}:${String(point._id)}:in:${input.sample.recordedAt.toISOString()}`,
        definitionId,
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

