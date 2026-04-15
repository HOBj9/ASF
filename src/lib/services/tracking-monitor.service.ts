import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Branch from '@/models/Branch';
import Driver from '@/models/Driver';
import TrackingBinding from '@/models/TrackingBinding';
import TrackingIngressMessage from '@/models/TrackingIngressMessage';
import TrackingProviderConfig from '@/models/TrackingProviderConfig';
import TrackingVehicleState from '@/models/TrackingVehicleState';
import User from '@/models/User';
import Vehicle from '@/models/Vehicle';
import { LiveTrackingService } from '@/lib/services/live-tracking.service';
import { isAdmin, isOrganizationAdmin } from '@/lib/permissions';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import type { TrackingProvider } from '@/lib/tracking/types';

type ScopeBranch = {
  _id: unknown;
  organizationId: unknown;
  name: string;
  nameAr?: string | null;
  atharKey?: string | null;
};

type TrackingMonitorScope = {
  type: 'branch' | 'organization';
  organizationId: string | null;
  branchId: string | null;
  branches: ScopeBranch[];
};

export interface TrackingMonitorOverviewOptions {
  branchId?: string | null;
  organizationId?: string | null;
  bindingsLimit?: number;
  messagesLimit?: number;
}

function normalizeLimit(value: unknown, fallbackValue: number, maxValue: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallbackValue;
  return Math.min(Math.floor(numeric), maxValue);
}

function createEmptyProviderCounts<TValue>(valueFactory: () => TValue) {
  return {
    athar: valueFactory(),
    mobile_app: valueFactory(),
    traccar: valueFactory(),
  };
}

function getProviderLabel(provider: TrackingProvider): string {
  if (provider === 'mobile_app') return 'تطبيق الموبايل';
  if (provider === 'traccar') return 'تراكار';
  return 'أثر';
}

export class TrackingMonitorService {
  private readonly liveTrackingService = new LiveTrackingService();

  async getOverview(session: any, options: TrackingMonitorOverviewOptions = {}) {
    await connectDB();

    const scope = await this.resolveScope(session, options);
    const branchIds = scope.branches.map((branch) => String(branch._id));
    const branchObjectIds = branchIds.flatMap((branchId) =>
      mongoose.Types.ObjectId.isValid(branchId) ? [new mongoose.Types.ObjectId(branchId)] : []
    );
    const branchNameMap = new Map(
      scope.branches.map((branch) => [String(branch._id), branch.nameAr || branch.name || String(branch._id)])
    );

    if (branchIds.length === 0) {
      return {
        scope: {
          type: scope.type,
          organizationId: scope.organizationId,
          branchId: scope.branchId,
          branchCount: 0,
        },
        summary: {
          branchCount: 0,
          totalVehicles: 0,
          providerVehicleCounts: createEmptyProviderCounts(() => 0),
          activeBindingCounts: createEmptyProviderCounts(() => 0),
          primaryBindingCounts: createEmptyProviderCounts(() => 0),
          liveConnectivityCounts: {
            moving: 0,
            stopped: 0,
            offline: 0,
          },
          ingressLast24h: {
            total: 0,
            processed: 0,
            duplicate: 0,
            ignored_late: 0,
            rejected: 0,
            error: 0,
          },
          providerEnabledBranches: createEmptyProviderCounts(() => 0),
        },
        liveVehicles: [],
        bindings: [],
        recentMessages: [],
        branchProviders: [],
      };
    }

    const bindingsLimit = normalizeLimit(options.bindingsLimit, 200, 500);
    const messagesLimit = normalizeLimit(options.messagesLimit, 100, 300);
    const since24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [vehicles, bindings, states, messages, providerConfigs, ingressStats, liveLocationsByBranch] =
      await Promise.all([
        Vehicle.find({ branchId: { $in: branchIds } })
          .select('branchId name plateNumber imei trackingProvider driverId isActive')
          .sort({ name: 1 })
          .lean(),
        TrackingBinding.find({ branchId: { $in: branchIds } })
          .select('branchId vehicleId provider externalId userId capabilities isPrimary isActive lastSeenAt metadata updatedAt')
          .sort({ isActive: -1, isPrimary: -1, updatedAt: -1 })
          .limit(bindingsLimit)
          .lean(),
        TrackingVehicleState.find({ branchId: { $in: branchIds } })
          .select('branchId vehicleId bindingId provider lastProcessedAt lastRecordedAt lastReceivedAt lastLocation speed heading accuracy insidePointIds connectivityStatus')
          .lean(),
        TrackingIngressMessage.find({ branchId: { $in: branchIds } })
          .select('branchId vehicleId bindingId provider providerMessageId status receivedAt processedAt errorMessage rawPayload')
          .sort({ receivedAt: -1 })
          .limit(messagesLimit)
          .lean(),
        TrackingProviderConfig.find({ branchId: { $in: branchIds } })
          .select('branchId provider isEnabled legacyFallback config updatedAt')
          .lean(),
        TrackingIngressMessage.aggregate([
          {
            $match: {
              branchId: { $in: branchObjectIds },
              receivedAt: { $gte: since24Hours },
            },
          },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]),
        Promise.all(
          scope.branches.map(async (branch) => ({
            branchId: String(branch._id),
            items: await this.liveTrackingService.getBranchVehicleLocations(String(branch._id)),
          }))
        ),
      ]);

    const vehicleIds = new Set<string>();
    const driverIds = new Set<string>();
    const userIds = new Set<string>();

    for (const vehicle of vehicles) {
      vehicleIds.add(String(vehicle._id));
      if (vehicle.driverId) driverIds.add(String(vehicle.driverId));
    }

    for (const binding of bindings) {
      if (binding.vehicleId) vehicleIds.add(String(binding.vehicleId));
      if (binding.userId) userIds.add(String(binding.userId));
    }

    for (const state of states) {
      if (state.vehicleId) vehicleIds.add(String(state.vehicleId));
      if (state.bindingId) {
        const matchedBinding = bindings.find((binding) => String(binding._id) === String(state.bindingId));
        if (matchedBinding?.userId) userIds.add(String(matchedBinding.userId));
      }
    }

    const [drivers, users] = await Promise.all([
      driverIds.size
        ? Driver.find({ _id: { $in: Array.from(driverIds) } }).select('name').lean()
        : Promise.resolve([]),
      userIds.size
        ? User.find({ _id: { $in: Array.from(userIds) } }).select('name email').lean()
        : Promise.resolve([]),
    ]);

    const vehicleMap = new Map(vehicles.map((vehicle) => [String(vehicle._id), vehicle]));
    const driverNameMap = new Map(drivers.map((driver) => [String(driver._id), driver.name || null]));
    const userMap = new Map(users.map((user) => [String(user._id), user]));
    const bindingMap = new Map(bindings.map((binding) => [String(binding._id), binding]));
    const primaryBindingByVehicleId = new Map<string, any>();
    const stateByVehicleId = new Map(states.map((state) => [String(state.vehicleId), state]));

    for (const binding of bindings) {
      if (binding.isPrimary) {
        primaryBindingByVehicleId.set(String(binding.vehicleId), binding);
      }
    }

    const activeVehicles = vehicles.filter((vehicle) => vehicle.isActive !== false);
    const providerVehicleCounts = createEmptyProviderCounts(() => 0);
    for (const vehicle of activeVehicles) {
      const provider = (vehicle.trackingProvider || 'athar') as TrackingProvider;
      providerVehicleCounts[provider] += 1;
    }

    const activeBindingCounts = createEmptyProviderCounts(() => 0);
    const primaryBindingCounts = createEmptyProviderCounts(() => 0);
    for (const binding of bindings) {
      if (binding.isActive) activeBindingCounts[binding.provider as TrackingProvider] += 1;
      if (binding.isPrimary) primaryBindingCounts[binding.provider as TrackingProvider] += 1;
    }

    const liveConnectivityCounts = {
      moving: 0,
      stopped: 0,
      offline: 0,
    };

    const liveVehicles = liveLocationsByBranch.flatMap(({ branchId, items }) =>
      items.map((item) => {
        const vehicle = vehicleMap.get(String(item.id));
        const state = stateByVehicleId.get(String(item.id));
        const binding = primaryBindingByVehicleId.get(String(item.id));
        const user = binding?.userId ? userMap.get(String(binding.userId)) : null;
        const provider = (item.provider || vehicle?.trackingProvider || 'athar') as TrackingProvider;

        liveConnectivityCounts[item.status] += 1;

        return {
          vehicleId: String(item.id),
          branchId,
          branchName: branchNameMap.get(branchId) || branchId,
          vehicleName: vehicle?.name || item.busNumber || `مركبة ${String(item.id).slice(-4)}`,
          plateNumber: vehicle?.plateNumber || item.busNumber || null,
          provider,
          providerLabel: getProviderLabel(provider),
          connectivityStatus: item.status,
          driverName: item.driverName || (vehicle?.driverId ? driverNameMap.get(String(vehicle.driverId)) : null) || 'غير محدد',
          lineSupervisorName: user?.name || null,
          lastUpdateLabel: item.lastUpdate || 'غير متصل',
          lastReceivedAt: item.lastReceivedAt || state?.lastReceivedAt || null,
          lastRecordedAt: item.lastRecordedAt || state?.lastRecordedAt || null,
          speed: Number(item.speed || state?.speed || 0),
          heading: Number(item.heading || state?.heading || 0),
          accuracy: item.accuracy ?? state?.accuracy ?? null,
          coordinates: Array.isArray(item.coordinates) ? item.coordinates : null,
          insidePointCount: Array.isArray(state?.insidePointIds) ? state.insidePointIds.length : 0,
        };
      })
    );

    const bindingsList = bindings.map((binding) => {
      const vehicle = vehicleMap.get(String(binding.vehicleId));
      const user = binding.userId ? userMap.get(String(binding.userId)) : null;
      const branchId = String(binding.branchId);
      const metadata = (binding.metadata || {}) as Record<string, any>;

      return {
        _id: String(binding._id),
        branchId,
        branchName: branchNameMap.get(branchId) || branchId,
        provider: binding.provider as TrackingProvider,
        providerLabel: getProviderLabel(binding.provider as TrackingProvider),
        vehicleId: String(binding.vehicleId),
        vehicleName: vehicle?.name || 'مركبة غير معروفة',
        plateNumber: vehicle?.plateNumber || null,
        externalId: binding.externalId || null,
        isPrimary: Boolean(binding.isPrimary),
        isActive: Boolean(binding.isActive),
        lastSeenAt: binding.lastSeenAt || null,
        lineSupervisorName: user?.name || null,
        lineSupervisorEmail: user?.email || null,
        capabilities: Array.isArray(binding.capabilities) ? binding.capabilities : [],
        deviceName: typeof metadata.deviceName === 'string' ? metadata.deviceName : null,
        platform: typeof metadata.platform === 'string' ? metadata.platform : null,
        appVersion: typeof metadata.appVersion === 'string' ? metadata.appVersion : null,
      };
    });

    const recentMessages = messages.map((message) => {
      const branchId = message.branchId ? String(message.branchId) : null;
      const vehicle = message.vehicleId ? vehicleMap.get(String(message.vehicleId)) : null;
      const binding = message.bindingId ? bindingMap.get(String(message.bindingId)) : null;
      const rawPayload = (message.rawPayload || {}) as Record<string, any>;
      const batchSize = Array.isArray(rawPayload.samples)
        ? rawPayload.samples.length
        : Array.isArray(rawPayload.points)
          ? rawPayload.points.length
          : null;

      return {
        _id: String(message._id),
        branchId,
        branchName: branchId ? branchNameMap.get(branchId) || branchId : 'غير محدد',
        vehicleId: message.vehicleId ? String(message.vehicleId) : null,
        vehicleName: vehicle?.name || null,
        plateNumber: vehicle?.plateNumber || null,
        provider: message.provider as TrackingProvider,
        providerLabel: getProviderLabel(message.provider as TrackingProvider),
        providerMessageId: message.providerMessageId,
        status: message.status,
        receivedAt: message.receivedAt,
        processedAt: message.processedAt || null,
        errorMessage: message.errorMessage || null,
        bindingId: message.bindingId ? String(message.bindingId) : null,
        bindingProvider: binding?.provider || null,
        batchSize,
      };
    });

    const ingressLast24h = {
      total: 0,
      processed: 0,
      duplicate: 0,
      ignored_late: 0,
      rejected: 0,
      error: 0,
    };

    for (const entry of ingressStats) {
      const status = String(entry._id || '') as keyof typeof ingressLast24h;
      const count = Number(entry.count || 0);
      if (status in ingressLast24h) {
        ingressLast24h[status] += count;
      }
      ingressLast24h.total += count;
    }

    const configMap = new Map(
      providerConfigs.map((config) => [`${String(config.branchId)}:${config.provider}`, config])
    );
    const providerEnabledBranches = createEmptyProviderCounts(() => 0);

    const branchProviders = scope.branches.map((branch) => {
      const branchId = String(branch._id);
      const atharConfig = configMap.get(`${branchId}:athar`);
      const atharCustomApiKey =
        typeof atharConfig?.config?.apiKey === 'string' ? atharConfig.config.apiKey.trim() : '';
      const atharLegacyFallback = atharConfig?.legacyFallback !== false;
      const atharLegacyKey = String(branch.atharKey || '').trim();
      const atharEnabled = atharConfig
        ? atharConfig.isEnabled !== false && Boolean(atharCustomApiKey || (atharLegacyFallback && atharLegacyKey))
        : Boolean(atharLegacyKey);
      const atharSource = atharCustomApiKey
        ? 'config'
        : atharEnabled
          ? 'legacy_branch_key'
          : atharConfig
            ? 'configured_without_key'
            : 'not_configured';

      const mobileConfig = configMap.get(`${branchId}:mobile_app`);
      const mobileEnabled = mobileConfig?.isEnabled === true;
      const traccarConfig = configMap.get(`${branchId}:traccar`);
      const traccarEnabled = traccarConfig?.isEnabled === true;

      if (atharEnabled) providerEnabledBranches.athar += 1;
      if (mobileEnabled) providerEnabledBranches.mobile_app += 1;
      if (traccarEnabled) providerEnabledBranches.traccar += 1;

      return {
        branchId,
        branchName: branch.nameAr || branch.name || branchId,
        providers: {
          athar: {
            enabled: atharEnabled,
            source: atharSource,
            legacyFallback: atharLegacyFallback,
          },
          mobile_app: {
            enabled: mobileEnabled,
            source: mobileConfig ? 'config' : 'not_configured',
          },
          traccar: {
            enabled: traccarEnabled,
            source: traccarConfig ? 'config' : 'not_configured',
          },
        },
      };
    });

    return {
      scope: {
        type: scope.type,
        organizationId: scope.organizationId,
        branchId: scope.branchId,
        branchCount: scope.branches.length,
      },
      summary: {
        branchCount: scope.branches.length,
        totalVehicles: activeVehicles.length,
        providerVehicleCounts,
        activeBindingCounts,
        primaryBindingCounts,
        liveConnectivityCounts,
        ingressLast24h,
        providerEnabledBranches,
      },
      liveVehicles,
      bindings: bindingsList,
      recentMessages,
      branchProviders,
    };
  }

  private async resolveScope(
    session: any,
    options: TrackingMonitorOverviewOptions
  ): Promise<TrackingMonitorScope> {
    const role = session?.user?.role || null;
    const sessionBranchId = session?.user?.branchId ? String(session.user.branchId) : null;
    const sessionOrganizationId = session?.user?.organizationId ? String(session.user.organizationId) : null;
    const requestedBranchId = String(options.branchId || '').trim() || null;
    const requestedOrganizationId = String(options.organizationId || '').trim() || null;

    if (isAdmin(role)) {
      if (requestedBranchId || sessionBranchId) {
        const branchId = requestedBranchId || sessionBranchId;
        const branch = await Branch.findById(branchId)
          .select('organizationId name nameAr atharKey')
          .lean();

        if (!branch) {
          throw new Error('الفرع المحدد غير موجود');
        }

        return {
          type: 'branch',
          organizationId: branch.organizationId ? String(branch.organizationId) : null,
          branchId: String(branch._id),
          branches: [branch as ScopeBranch],
        };
      }

      const organizationId = await resolveOrganizationId(session, requestedOrganizationId || sessionOrganizationId);
      const branches = await Branch.find({ organizationId })
        .select('organizationId name nameAr atharKey')
        .sort({ name: 1 })
        .lean();

      return {
        type: 'organization',
        organizationId,
        branchId: null,
        branches: branches as ScopeBranch[],
      };
    }

    if (isOrganizationAdmin(role)) {
      const organizationId = await resolveOrganizationId(session, null);
      if (requestedBranchId || sessionBranchId) {
        const branchId = requestedBranchId || sessionBranchId;
        const branch = await Branch.findOne({ _id: branchId, organizationId })
          .select('organizationId name nameAr atharKey')
          .lean();

        if (!branch) {
          throw new Error('الفرع المحدد غير تابع للمؤسسة');
        }

        return {
          type: 'branch',
          organizationId,
          branchId: String(branch._id),
          branches: [branch as ScopeBranch],
        };
      }

      const branches = await Branch.find({ organizationId })
        .select('organizationId name nameAr atharKey')
        .sort({ name: 1 })
        .lean();

      return {
        type: 'organization',
        organizationId,
        branchId: null,
        branches: branches as ScopeBranch[],
      };
    }

    if (!sessionBranchId) {
      throw new Error('لا يوجد فرع مرتبط بالحساب');
    }

    const branch = await Branch.findById(sessionBranchId)
      .select('organizationId name nameAr atharKey')
      .lean();

    if (!branch) {
      throw new Error('الفرع المحدد غير موجود');
    }

    return {
      type: 'branch',
      organizationId: branch.organizationId ? String(branch.organizationId) : null,
      branchId: String(branch._id),
      branches: [branch as ScopeBranch],
    };
  }
}
