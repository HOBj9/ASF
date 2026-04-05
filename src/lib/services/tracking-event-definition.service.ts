import connectDB from '@/lib/mongodb';
import { AtharService } from '@/lib/services/athar.service';
import Branch from '@/models/Branch';
import Point from '@/models/Point';
import TrackingEventDefinition, {
  type ITrackingEventDefinition,
  type TrackingEventType,
} from '@/models/TrackingEventDefinition';
import TrackingProviderConfig from '@/models/TrackingProviderConfig';
import Vehicle from '@/models/Vehicle';
import type {
  TrackingEventDefinitionScope,
  TrackingEventDefinitionSyncStatus,
  TrackingProvider,
  ZoneEventProvider,
} from '@/lib/tracking/types';

type VehicleLike = {
  _id: unknown;
  branchId: unknown;
  trackingProvider?: TrackingProvider | null;
  acceptedTrackingProviders?: TrackingProvider[] | null;
  zoneEventProvider?: ZoneEventProvider | null;
  imei?: string | null;
  atharObjectId?: string | null;
  name?: string | null;
  plateNumber?: string | null;
};

type PointLike = {
  _id: unknown;
  branchId?: unknown;
  organizationId?: unknown;
  zoneId?: string | null;
  name?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  lat?: number | null;
  lng?: number | null;
  radiusMeters?: number | null;
};

type BranchLike = {
  _id: unknown;
  organizationId?: unknown;
};

export interface ListTrackingEventDefinitionsInput {
  branchId: string;
  providerTarget?: ZoneEventProvider;
  vehicleId?: string;
  pointId?: string;
  isActive?: boolean;
}

export interface BulkUpsertTrackingEventDefinitionsInput {
  branchId: string;
  providerTarget: ZoneEventProvider;
  vehicleIds: string[];
  pointIds: string[];
  eventTypes?: TrackingEventType[];
  isActive?: boolean;
  actorUserId?: string | null;
  actorScope?: TrackingEventDefinitionScope;
}

export interface SetTrackingEventDefinitionsStateInput {
  branchId: string;
  isActive: boolean;
  definitionIds?: string[];
  providerTarget?: ZoneEventProvider;
  vehicleId?: string;
  pointId?: string;
  actorUserId?: string | null;
  actorScope?: TrackingEventDefinitionScope;
}

export interface SyncAtharTrackingEventDefinitionsInput {
  branchId: string;
  definitionIds?: string[];
}

function normalizeTrackingProvider(provider?: TrackingProvider | null): TrackingProvider {
  if (provider === 'mobile_app' || provider === 'traccar') return provider;
  return 'athar';
}

function normalizeAcceptedProviders(vehicle: VehicleLike): TrackingProvider[] {
  if (Array.isArray(vehicle.acceptedTrackingProviders) && vehicle.acceptedTrackingProviders.length > 0) {
    return Array.from(new Set(vehicle.acceptedTrackingProviders.map((provider) => normalizeTrackingProvider(provider))));
  }
  return [normalizeTrackingProvider(vehicle.trackingProvider)];
}

function normalizeZoneEventProvider(vehicle: VehicleLike): ZoneEventProvider {
  if (vehicle.zoneEventProvider === 'mobile_app' || vehicle.zoneEventProvider === 'athar') {
    return vehicle.zoneEventProvider;
  }
  return normalizeTrackingProvider(vehicle.trackingProvider) === 'mobile_app' ? 'mobile_app' : 'athar';
}

function normalizeDefinitionEventTypes(eventTypes?: TrackingEventType[]): TrackingEventType[] {
  const values = Array.isArray(eventTypes) && eventTypes.length > 0 ? eventTypes : ['zone_in', 'zone_out'];
  return Array.from(new Set(values.filter((value): value is TrackingEventType => value === 'zone_in' || value === 'zone_out')));
}

function toPointLabel(point: PointLike): string {
  return point.nameAr || point.nameEn || point.name || `Point ${String(point._id)}`;
}

async function ensureBranch(branchId: string): Promise<BranchLike> {
  const branch = await Branch.findById(branchId).select('_id organizationId').lean<BranchLike | null>();
  if (!branch) {
    throw new Error('الفرع غير موجود');
  }
  return branch;
}

export class TrackingEventDefinitionService {
  async listDefinitions(input: ListTrackingEventDefinitionsInput) {
    await connectDB();

    const filter: Record<string, unknown> = { branchId: input.branchId };
    if (input.providerTarget) filter.providerTarget = input.providerTarget;
    if (input.vehicleId) filter.vehicleId = input.vehicleId;
    if (input.pointId) filter.pointId = input.pointId;
    if (typeof input.isActive === 'boolean') filter.isActive = input.isActive;

    return TrackingEventDefinition.find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate('vehicleId', 'name plateNumber imei trackingProvider acceptedTrackingProviders zoneEventProvider')
      .populate('pointId', 'name nameAr nameEn zoneId radiusMeters lat lng')
      .lean();
  }

  async bulkUpsertDefinitions(input: BulkUpsertTrackingEventDefinitionsInput) {
    await connectDB();

    const branch = await ensureBranch(input.branchId);
    const vehicleIds = Array.from(new Set((input.vehicleIds || []).map((value) => String(value).trim()).filter(Boolean)));
    const pointIds = Array.from(new Set((input.pointIds || []).map((value) => String(value).trim()).filter(Boolean)));
    const eventTypes = normalizeDefinitionEventTypes(input.eventTypes);

    if (vehicleIds.length === 0) {
      throw new Error('يرجى تحديد مركبة واحدة على الأقل');
    }
    if (pointIds.length === 0) {
      throw new Error('يرجى تحديد نقطة واحدة على الأقل');
    }

    const [vehicles, points] = await Promise.all([
      Vehicle.find({ _id: { $in: vehicleIds }, branchId: input.branchId })
        .select('branchId trackingProvider acceptedTrackingProviders zoneEventProvider imei atharObjectId name plateNumber')
        .lean<VehicleLike[]>(),
      Point.find({
        _id: { $in: pointIds },
        $or: [
          { branchId: input.branchId },
          { branchId: null, organizationId: branch.organizationId || null },
        ],
      })
        .select('branchId organizationId zoneId name nameAr nameEn lat lng radiusMeters')
        .lean<PointLike[]>(),
    ]);

    if (vehicles.length !== vehicleIds.length) {
      throw new Error('بعض المركبات غير موجودة ضمن الفرع المحدد');
    }
    if (points.length !== pointIds.length) {
      throw new Error('بعض النقاط غير موجودة ضمن الفرع المحدد');
    }

    const pointById = new Map(points.map((point) => [String(point._id), point]));
    const actorScope = input.actorScope || 'branch';
    const actorUserId = input.actorUserId || null;
    const shouldBeActive = input.isActive ?? true;

    const createdIds: string[] = [];
    const updatedIds: string[] = [];
    const syncedIds: string[] = [];
    const failedIds: string[] = [];
    const definitions: any[] = [];

    for (const vehicle of vehicles) {
      const acceptedProviders = normalizeAcceptedProviders(vehicle);
      const zoneEventProvider = normalizeZoneEventProvider(vehicle);

      if (!acceptedProviders.includes(input.providerTarget)) {
        throw new Error(`المركبة ${vehicle.name || vehicle.plateNumber || vehicle._id} لا تقبل المزود ${input.providerTarget}`);
      }
      if (shouldBeActive && zoneEventProvider !== input.providerTarget) {
        throw new Error(
          `المركبة ${vehicle.name || vehicle.plateNumber || vehicle._id} تعتمد ${zoneEventProvider} كمزود أحداث مناطق`
        );
      }

      for (const pointId of pointIds) {
        const point = pointById.get(pointId);
        if (!point) continue;

        for (const eventType of eventTypes) {
          const existing = await TrackingEventDefinition.findOne({
            branchId: input.branchId,
            vehicleId: String(vehicle._id),
            pointId,
            providerTarget: input.providerTarget,
            eventType,
          }).exec();

          const zoneIdSnapshot = typeof point.zoneId === 'string' && point.zoneId.trim() ? point.zoneId.trim() : null;

          if (!existing) {
            const created = await TrackingEventDefinition.create({
              branchId: input.branchId,
              organizationId: branch.organizationId || null,
              vehicleId: String(vehicle._id),
              pointId,
              zoneIdSnapshot,
              providerTarget: input.providerTarget,
              eventType,
              isActive: shouldBeActive,
              externalSyncStatus: input.providerTarget === 'mobile_app' ? 'not_required' : 'pending',
              createdByUserId: actorUserId,
              updatedByUserId: actorUserId,
              createdByScope: actorScope,
              updatedByScope: actorScope,
            });
            createdIds.push(String(created._id));
            definitions.push(created.toObject());

            if (input.providerTarget === 'athar' && shouldBeActive) {
              const syncResult = await this.syncAtharDefinitionById(String(created._id));
              if (syncResult.status === 'synced') syncedIds.push(String(created._id));
              if (syncResult.status === 'failed') failedIds.push(String(created._id));
            }
            continue;
          }

          const updates: Record<string, unknown> = {
            organizationId: branch.organizationId || null,
            zoneIdSnapshot,
            isActive: shouldBeActive,
            updatedByUserId: actorUserId,
            updatedByScope: actorScope,
          };

          if (input.providerTarget === 'mobile_app') {
            updates.externalSyncStatus = 'not_required';
            updates.externalSyncError = null;
          } else {
            const zoneChanged = existing.zoneIdSnapshot !== zoneIdSnapshot;
            if (zoneChanged && shouldBeActive) {
              updates.externalSyncStatus = 'pending';
              updates.externalSyncError = null;
            }
          }

          const updated = await TrackingEventDefinition.findByIdAndUpdate(existing._id, updates, {
            new: true,
            runValidators: true,
          }).lean();

          if (updated) {
            updatedIds.push(String(updated._id));
            definitions.push(updated);
            if (input.providerTarget === 'athar' && shouldBeActive) {
              const syncResult = await this.syncAtharDefinitionById(String(updated._id));
              if (syncResult.status === 'synced') syncedIds.push(String(updated._id));
              if (syncResult.status === 'failed') failedIds.push(String(updated._id));
            }
          }
        }
      }
    }

    return {
      createdCount: createdIds.length,
      updatedCount: updatedIds.length,
      syncedCount: syncedIds.length,
      failedCount: failedIds.length,
      definitions,
    };
  }

  async setDefinitionsState(input: SetTrackingEventDefinitionsStateInput) {
    await connectDB();

    const filter: Record<string, unknown> = { branchId: input.branchId };
    if (Array.isArray(input.definitionIds) && input.definitionIds.length > 0) {
      filter._id = { $in: input.definitionIds };
    }
    if (input.providerTarget) filter.providerTarget = input.providerTarget;
    if (input.vehicleId) filter.vehicleId = input.vehicleId;
    if (input.pointId) filter.pointId = input.pointId;

    const definitions = await TrackingEventDefinition.find(filter)
      .populate('vehicleId', 'trackingProvider acceptedTrackingProviders zoneEventProvider name plateNumber')
      .exec();

    const actorScope = input.actorScope || 'branch';
    const actorUserId = input.actorUserId || null;
    let updatedCount = 0;
    let syncedCount = 0;
    let failedCount = 0;

    for (const definition of definitions) {
      const vehicle = definition.vehicleId as any as VehicleLike;
      const acceptedProviders = normalizeAcceptedProviders(vehicle);
      const zoneEventProvider = normalizeZoneEventProvider(vehicle);

      if (input.isActive) {
        if (!acceptedProviders.includes(definition.providerTarget)) {
          throw new Error(`المركبة ${vehicle?.name || vehicle?.plateNumber || vehicle?._id} لا تقبل المزود ${definition.providerTarget}`);
        }
        if (zoneEventProvider !== definition.providerTarget) {
          throw new Error(
            `المركبة ${vehicle?.name || vehicle?.plateNumber || vehicle?._id} تعتمد ${zoneEventProvider} كمزود أحداث مناطق`
          );
        }
      }

      const updates: Record<string, unknown> = {
        isActive: input.isActive,
        updatedByUserId: actorUserId,
        updatedByScope: actorScope,
      };

      if (definition.providerTarget === 'mobile_app') {
        updates.externalSyncStatus = 'not_required';
        updates.externalSyncError = null;
      } else if (input.isActive) {
        updates.externalSyncStatus = definition.externalEventId ? definition.externalSyncStatus : 'pending';
        updates.externalSyncError = null;
      }

      const updated = await TrackingEventDefinition.findByIdAndUpdate(definition._id, updates, {
        new: true,
        runValidators: true,
      }).exec();

      if (!updated) continue;
      updatedCount += 1;

      if (updated.providerTarget === 'athar' && input.isActive) {
        const syncResult = await this.syncAtharDefinitionById(String(updated._id));
        if (syncResult.status === 'synced') syncedCount += 1;
        if (syncResult.status === 'failed') failedCount += 1;
      }
    }

    return { updatedCount, syncedCount, failedCount };
  }

  async syncAtharDefinitions(input: SyncAtharTrackingEventDefinitionsInput) {
    await connectDB();

    const filter: Record<string, unknown> = {
      branchId: input.branchId,
      providerTarget: 'athar',
    };
    if (Array.isArray(input.definitionIds) && input.definitionIds.length > 0) {
      filter._id = { $in: input.definitionIds };
    }

    const definitions = await TrackingEventDefinition.find(filter).select('_id').lean();

    let syncedCount = 0;
    let failedCount = 0;

    for (const definition of definitions as any[]) {
      const result = await this.syncAtharDefinitionById(String(definition._id));
      if (result.status === 'synced') syncedCount += 1;
      if (result.status === 'failed') failedCount += 1;
    }

    return {
      total: definitions.length,
      syncedCount,
      failedCount,
    };
  }

  async resolveActiveDefinitionsForVehicleProvider(input: {
    branchId: string;
    vehicleId: string;
    providerTarget: ZoneEventProvider;
  }) {
    await connectDB();

    return TrackingEventDefinition.find({
      branchId: input.branchId,
      vehicleId: input.vehicleId,
      providerTarget: input.providerTarget,
      isActive: true,
    })
      .populate('pointId', 'name nameAr nameEn zoneId lat lng radiusMeters branchId organizationId')
      .lean();
  }

  async findMatchingActiveDefinition(input: {
    branchId: string;
    vehicleId: string;
    pointId: string;
    providerTarget: ZoneEventProvider;
    eventType: TrackingEventType;
  }) {
    await connectDB();

    return TrackingEventDefinition.findOne({
      branchId: input.branchId,
      vehicleId: input.vehicleId,
      pointId: input.pointId,
      providerTarget: input.providerTarget,
      eventType: input.eventType,
      isActive: true,
    }).lean();
  }

  async getCoverage(input: { branchId: string; providerTarget?: ZoneEventProvider }) {
    await connectDB();

    const branch = await ensureBranch(input.branchId);
    const providers: ZoneEventProvider[] = input.providerTarget
      ? [input.providerTarget]
      : ['athar', 'mobile_app'];

    const points = await Point.find({
      $or: [
        { branchId: input.branchId },
        { branchId: null, organizationId: branch.organizationId || null },
      ],
      isActive: true,
    })
      .select('name nameAr nameEn zoneId')
      .lean<PointLike[]>();

    const pointsById = new Map(points.map((point) => [String(point._id), point]));

    const coverageByProvider: Record<string, unknown> = {};

    for (const providerTarget of providers) {
      const vehicles = await Vehicle.find({ branchId: input.branchId, isActive: true })
        .select('name plateNumber trackingProvider acceptedTrackingProviders zoneEventProvider')
        .lean<VehicleLike[]>();
      const eligibleVehicles = vehicles.filter((vehicle) => normalizeAcceptedProviders(vehicle).includes(providerTarget));
      const definitions = await TrackingEventDefinition.find({
        branchId: input.branchId,
        providerTarget,
        isActive: true,
      })
        .select('vehicleId pointId externalSyncStatus externalSyncError')
        .lean();

      const definitionKeys = new Set(
        (definitions as any[]).map((definition) => `${String(definition.vehicleId)}:${String(definition.pointId)}`)
      );
      const failedDefinitions = (definitions as any[])
        .filter((definition) => definition.externalSyncStatus === 'failed')
        .map((definition) => ({
          _id: String(definition._id),
          vehicleId: String(definition.vehicleId),
          pointId: String(definition.pointId),
          pointName: toPointLabel(pointsById.get(String(definition.pointId)) || { _id: definition.pointId }),
          externalSyncError: definition.externalSyncError || null,
        }));

      const uncoveredVehicles = eligibleVehicles
        .filter((vehicle) => !definitions.some((definition: any) => String(definition.vehicleId) === String(vehicle._id)))
        .map((vehicle) => ({
          _id: String(vehicle._id),
          name: vehicle.name || vehicle.plateNumber || String(vehicle._id),
          plateNumber: vehicle.plateNumber || null,
        }));

      const uncoveredPoints = points
        .filter((point) =>
          eligibleVehicles.some((vehicle) => !definitionKeys.has(`${String(vehicle._id)}:${String(point._id)}`))
        )
        .map((point) => ({
          _id: String(point._id),
          name: toPointLabel(point),
          zoneId: point.zoneId || null,
        }));

      coverageByProvider[providerTarget] = {
        vehiclesCount: eligibleVehicles.length,
        pointsCount: points.length,
        activeDefinitionsCount: definitions.length,
        uncoveredVehicles,
        uncoveredPoints,
        failedDefinitions,
      };
    }

    return {
      branchId: input.branchId,
      coverageByProvider,
    };
  }

  async isLegacyFallbackEnabled(branchId: string, providerTarget: ZoneEventProvider): Promise<boolean> {
    await connectDB();

    const config = await TrackingProviderConfig.findOne({ branchId, provider: providerTarget })
      .select('config')
      .lean();
    const flag = config?.config?.eventDefinitionsLegacyFallback;
    return flag === undefined ? true : Boolean(flag);
  }

  private async syncAtharDefinitionById(definitionId: string): Promise<{
    status: TrackingEventDefinitionSyncStatus;
    definition: ITrackingEventDefinition | null;
  }> {
    const definition = await TrackingEventDefinition.findById(definitionId).exec();
    if (!definition) {
      throw new Error('تعريف الحدث غير موجود');
    }

    if (definition.providerTarget !== 'athar') {
      return { status: definition.externalSyncStatus, definition };
    }

    if (!definition.isActive) {
      return { status: definition.externalSyncStatus, definition };
    }

    const [vehicle, point] = await Promise.all([
      Vehicle.findById(definition.vehicleId)
        .select('imei name plateNumber trackingProvider acceptedTrackingProviders zoneEventProvider atharObjectId')
        .lean<VehicleLike | null>(),
      Point.findById(definition.pointId)
        .select('name nameAr nameEn zoneId lat lng radiusMeters')
        .lean<PointLike | null>(),
    ]);

    if (!vehicle) {
      definition.externalSyncStatus = 'failed';
      definition.externalSyncError = 'vehicle_not_found';
      await definition.save();
      return { status: definition.externalSyncStatus, definition };
    }

    const acceptedProviders = normalizeAcceptedProviders(vehicle);
    const zoneEventProvider = normalizeZoneEventProvider(vehicle);
    if (!acceptedProviders.includes('athar')) {
      definition.externalSyncStatus = 'failed';
      definition.externalSyncError = 'vehicle_not_accepting_athar';
      await definition.save();
      return { status: definition.externalSyncStatus, definition };
    }
    if (zoneEventProvider !== 'athar') {
      definition.externalSyncStatus = 'failed';
      definition.externalSyncError = 'vehicle_zone_event_provider_mismatch';
      await definition.save();
      return { status: definition.externalSyncStatus, definition };
    }
    if (!vehicle.imei || !String(vehicle.imei).trim()) {
      definition.externalSyncStatus = 'failed';
      definition.externalSyncError = 'vehicle_missing_imei';
      await definition.save();
      return { status: definition.externalSyncStatus, definition };
    }
    if (!point) {
      definition.externalSyncStatus = 'failed';
      definition.externalSyncError = 'point_not_found';
      await definition.save();
      return { status: definition.externalSyncStatus, definition };
    }

    try {
      const atharService = await AtharService.forBranch(String(definition.branchId));
      let zoneId = point.zoneId ? String(point.zoneId).trim() : '';

      if (!zoneId) {
        if (point.lat == null || point.lng == null) {
          throw new Error('point_missing_coordinates');
        }
        zoneId =
          (await atharService.ensureZone(
            toPointLabel(point),
            { lat: Number(point.lat), lng: Number(point.lng) },
            Number(point.radiusMeters || 500)
          )) || '';
        await Point.findByIdAndUpdate(point._id, { zoneId }).exec();
      }

      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'}/api/athar/webhook`;
      const externalEventId = await atharService.createZoneEvent(
        toPointLabel(point),
        zoneId,
        String(vehicle.imei).trim(),
        definition.eventType,
        webhookUrl
      );

      definition.zoneIdSnapshot = zoneId;
      definition.externalEventId = externalEventId || definition.externalEventId;
      definition.externalSyncStatus = 'synced';
      definition.externalSyncError = null;
      definition.lastSyncedAt = new Date();
      await definition.save();

      return { status: definition.externalSyncStatus, definition };
    } catch (error: any) {
      definition.externalSyncStatus = 'failed';
      definition.externalSyncError = error?.message || 'athar_sync_failed';
      await definition.save();
      return { status: definition.externalSyncStatus, definition };
    }
  }
}

export const trackingEventDefinitionService = new TrackingEventDefinitionService();
