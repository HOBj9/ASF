import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import IncomingAtharEvent from '@/models/IncomingAtharEvent';
import TrackingIngressMessage from '@/models/TrackingIngressMessage';
import Branch from '@/models/Branch';
import Vehicle from '@/models/Vehicle';
import Driver from '@/models/Driver';
import ZoneEvent from '@/models/ZoneEvent';
import { extractNumericZoneId, resolveAtharPoint } from '@/lib/utils/athar-point.util';
import { TrackingEventProcessorService } from '@/lib/services/tracking-event-processor.service';
import { resolveAtharProviderConfig } from '@/lib/trackingcore/provider-config';
import { trackingEventDefinitionService } from '@/lib/services/tracking-event-definition.service';
import type { TrackingProvider, ZoneEventProvider } from '@/lib/tracking/types';

type WebhookMethod = 'GET' | 'POST';
type ZoneEventType = 'zone_in' | 'zone_out';

interface ParsedWebhookPayload {
  sourcePath: string;
  query: Record<string, any>;
  headers: Record<string, string>;
  body: Record<string, any> | null;
  rawPayload: Record<string, any>;
  eventId: string | null;
  zoneIdRaw: string | null;
  zoneIdNormalized: string | null;
  zoneName: string | null;
  imei: string | null;
  type: string | null;
  desc: string | null;
  secret: string | null;
  timestampRaw: string | null;
  dtServer: string | null;
  dtTracker: string | null;
  lat: number | null;
  lng: number | null;
  speed: number | null;
  plateNumber: string | null;
  vehicleName: string | null;
}

const IMEI_BRANCH_CACHE_TTL_MS = 10 * 60 * 1000;
const IMEI_BRANCH_NEGATIVE_CACHE_TTL_MS = 60 * 1000;
const BRANCH_IMEI_SET_CACHE_TTL_MS = 10 * 60 * 1000;

interface ImeiBranchCacheEntry {
  branchId: string | null;
  expiresAt: number;
}

interface BranchImeisCacheEntry {
  imeis: Set<string>;
  expiresAt: number;
}

const imeiBranchCache = new Map<string, ImeiBranchCacheEntry>();
const branchImeisCache = new Map<string, BranchImeisCacheEntry>();
const trackingEventProcessor = new TrackingEventProcessorService();

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

function pickFirstString(...values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeZoneId(zoneIdRaw: string | null): string | null {
  if (!zoneIdRaw) return null;
  return extractNumericZoneId(zoneIdRaw);
}

function parseFlexibleTimestamp(rawValue: string | null): Date | null {
  if (!rawValue) return null;
  const value = rawValue.trim();
  if (!value) return null;

  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    if (value.length <= 10) {
      const secondsDate = new Date(numeric * 1000);
      return Number.isNaN(secondsDate.getTime()) ? null : secondsDate;
    }
    const millisDate = new Date(numeric);
    return Number.isNaN(millisDate.getTime()) ? null : millisDate;
  }

  const normalized = value.includes(' ') ? value.replace(' ', 'T') : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeImei(value: string | null): string | null {
  if (!value) return null;
  const cleaned = String(value).trim();
  return cleaned ? cleaned : null;
}

function normalizePlateNumber(value: string | null): string | null {
  if (!value) return null;
  const cleaned = String(value).trim();
  return cleaned ? cleaned : null;
}

function normalizeZoneLabel(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (/^\d+$/.test(cleaned)) return `النقطة ${cleaned}`;
  return cleaned;
}

function normalizeAtharObjects(payload: any): any[] {
  const source = payload?.objects ?? payload?.data ?? payload ?? {};
  if (Array.isArray(source)) return source;
  if (source && typeof source === 'object') {
    return Object.entries(source).map(([key, value]) => {
      const obj = value && typeof value === 'object' ? (value as Record<string, any>) : {};
      return {
        ...obj,
        id: obj.id ?? obj.object_id ?? obj.objectId ?? key,
      };
    });
  }
  return [];
}

async function fetchAtharObjectsByBranchId(branchId: string): Promise<any[]> {
  const resolvedConfig = await resolveAtharProviderConfig(branchId);
  if (!resolvedConfig?.apiKey) return [];

  const url = new URL(resolvedConfig.baseUrl);
  url.searchParams.set('cmd', 'USER_GET_OBJECTS');
  url.searchParams.set('api', resolvedConfig.api);
  url.searchParams.set('ver', resolvedConfig.version);
  url.searchParams.set('key', resolvedConfig.apiKey);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Athar-IoT/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Athar objects request failed: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  if (!text || !text.trim()) return [];

  const payload = JSON.parse(text);
  return normalizeAtharObjects(payload);
}

async function getAtharBranchImeis(branchId: string): Promise<Set<string>> {
  const now = Date.now();
  const cached = branchImeisCache.get(branchId);
  if (cached && cached.expiresAt > now) {
    return cached.imeis;
  }

  try {
    const objects = await fetchAtharObjectsByBranchId(branchId);
    const imeis = new Set(
      objects
        .map((obj: any) => normalizeImei(obj?.imei != null ? String(obj.imei) : null))
        .filter((value: string | null): value is string => Boolean(value))
    );

    branchImeisCache.set(branchId, {
      imeis,
      expiresAt: now + BRANCH_IMEI_SET_CACHE_TTL_MS,
    });
    return imeis;
  } catch (error) {
    console.error('[Athar Webhook] failed to fetch Athar objects for branch:', branchId, error);
    return new Set<string>();
  }
}

async function resolveBranchIdByAtharImei(imei: string): Promise<string | null> {
  const normalizedImei = normalizeImei(imei);
  if (!normalizedImei) return null;

  const now = Date.now();
  const cached = imeiBranchCache.get(normalizedImei);
  if (cached && cached.expiresAt > now) {
    return cached.branchId;
  }

  const atharBranches = await Branch.find({
    isActive: true,
    atharKey: { $exists: true, $type: 'string', $ne: '' },
  })
    .select('_id')
    .lean();

  for (const branch of atharBranches) {
    const branchId = String(branch._id);
    const imeis = await getAtharBranchImeis(branchId);
    if (imeis.has(normalizedImei)) {
      imeiBranchCache.set(normalizedImei, {
        branchId,
        expiresAt: now + IMEI_BRANCH_CACHE_TTL_MS,
      });
      return branchId;
    }
  }

  imeiBranchCache.set(normalizedImei, {
    branchId: null,
    expiresAt: now + IMEI_BRANCH_NEGATIVE_CACHE_TTL_MS,
  });

  return null;
}

async function parseBody(request: Request): Promise<Record<string, any> | null> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const parsed = await request.json().catch(() => null);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, any>;
    }
    return null;
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text().catch(() => '');
    if (!text) return null;
    return Object.fromEntries(new URLSearchParams(text).entries());
  }

  const text = await request.text().catch(() => '');
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, any>;
    }
  } catch {
    return { rawText: text };
  }

  return null;
}

async function parseWebhookPayload(request: Request, method: WebhookMethod): Promise<ParsedWebhookPayload> {
  const { searchParams, pathname } = new URL(request.url);
  const query = Object.fromEntries(searchParams.entries());
  const headers = Object.fromEntries(request.headers.entries());
  const body = method === 'POST' ? await parseBody(request) : null;

  const desc = pickFirstString(body?.desc, query.desc);
  const zoneName = pickFirstString(body?.zone_name, body?.zoneName, query.zone_name);
  const zoneIdRaw = pickFirstString(
    body?.zone_id,
    body?.zoneId,
    query.zone_id,
    extractNumericZoneId(desc)
  );

  const dtServer = pickFirstString(body?.dt_server, body?.dtServer, query.dt_server);
  const dtTracker = pickFirstString(body?.dt_tracker, body?.dtTracker, query.dt_tracker);
  const timestampRaw = pickFirstString(body?.timestamp, query.timestamp, dtServer, dtTracker);
  const rawType = pickFirstString(body?.type, query.type);
  const rawPayload = method === 'POST' ? { query, body: body || {} } : query;
  const plateNumber = normalizePlateNumber(
    pickFirstString(body?.plate_number, body?.plateNumber, query.plate_number, query.plateNumber)
  );
  const imei = normalizeImei(pickFirstString(body?.imei, query.imei));

  return {
    sourcePath: pathname,
    query,
    headers,
    body,
    rawPayload,
    eventId: pickFirstString(body?.event_id, body?.eventId, query.event_id),
    zoneIdRaw,
    zoneIdNormalized: normalizeZoneId(zoneIdRaw),
    zoneName,
    imei,
    type: rawType ? rawType.toLowerCase() : null,
    desc,
    secret: pickFirstString(body?.secret, query.secret),
    timestampRaw,
    dtServer,
    dtTracker,
    lat: parseNumber(pickFirstString(body?.lat, query.lat)),
    lng: parseNumber(pickFirstString(body?.lng, query.lng)),
    speed: parseNumber(pickFirstString(body?.speed, query.speed)),
    plateNumber,
    vehicleName: pickFirstString(body?.name, query.name),
  };
}

async function updateIncomingRecord(incomingId: string, updates: Record<string, any>): Promise<void> {
  try {
    await IncomingAtharEvent.findByIdAndUpdate(incomingId, updates).exec();
  } catch (error) {
    console.error('[Athar Webhook] failed to update incoming record:', error);
  }
}

async function updateTrackingIngressRecord(
  trackingIngressId: string | null,
  updates: Record<string, any>
): Promise<void> {
  if (!trackingIngressId) return;
  try {
    await TrackingIngressMessage.findByIdAndUpdate(trackingIngressId, updates).exec();
  } catch (error) {
    console.error('[Athar Webhook] failed to update tracking ingress record:', error);
  }
}

async function rejectAtharEvent(input: {
  incomingRecordId: string;
  trackingIngressId: string | null;
  branchId?: string | null;
  vehicleId?: string | null;
  message: string;
  status?: number;
}) {
  await updateIncomingRecord(input.incomingRecordId, {
    processingStatus: 'rejected',
    branchId: input.branchId || null,
    errorMessage: input.message,
  });
  await updateTrackingIngressRecord(input.trackingIngressId, {
    branchId: input.branchId || null,
    vehicleId: input.vehicleId || null,
    status: 'rejected',
    processedAt: new Date(),
    errorMessage: input.message,
  });
  return NextResponse.json({ success: true, ignored: true, reason: input.message }, { status: input.status || 200 });
}

export async function handleAtharWebhookRequest(
  request: Request,
  method: WebhookMethod
): Promise<NextResponse> {
  await connectDB();

  let incomingRecordId: string | null = null;
  let trackingIngressId: string | null = null;

  try {
    const parsed = await parseWebhookPayload(request, method);

    const incomingRecord = await IncomingAtharEvent.create({
      receivedAt: new Date(),
      sourceMethod: method,
      sourcePath: parsed.sourcePath,
      headers: parsed.headers,
      query: parsed.query,
      body: parsed.body,
      rawPayload: parsed.rawPayload,
      eventId: parsed.eventId,
      zoneIdRaw: parsed.zoneIdRaw,
      zoneIdNormalized: parsed.zoneIdNormalized,
      zoneName: parsed.zoneName,
      imei: parsed.imei,
      type: parsed.type,
      dtServer: parsed.dtServer,
      dtTracker: parsed.dtTracker,
      lat: parsed.lat,
      lng: parsed.lng,
      speed: parsed.speed,
      processingStatus: 'error',
      errorMessage: null,
    });
    incomingRecordId = String(incomingRecord._id);

    const providerMessageId =
      parsed.eventId ||
      `${method}:${parsed.imei || 'unknown'}:${parsed.type || 'unknown'}:${parsed.zoneIdNormalized || parsed.zoneName || 'unknown'}:${parsed.timestampRaw || 'now'}`;
    try {
      const trackingIngressRecord = await TrackingIngressMessage.create({
        provider: 'athar',
        providerMessageId,
        rawPayload: parsed.rawPayload,
        receivedAt: new Date(),
        status: 'received',
      });
      trackingIngressId = String(trackingIngressRecord._id);
    } catch (error: any) {
      if (error?.code === 11000) {
        const existingIngress = await TrackingIngressMessage.findOne({
          provider: 'athar',
          providerMessageId,
        })
          .select('_id')
          .lean();
        trackingIngressId = existingIngress?._id ? String(existingIngress._id) : null;
      } else {
        throw error;
      }
    }

    const configuredSecret = process.env.ATHAR_WEBHOOK_SECRET || '';
    if (configuredSecret && parsed.secret !== configuredSecret) {
      await updateIncomingRecord(incomingRecordId, {
        processingStatus: 'rejected',
        errorMessage: 'unauthorized',
      });
      await updateTrackingIngressRecord(trackingIngressId, {
        status: 'rejected',
        processedAt: new Date(),
        errorMessage: 'unauthorized',
      });
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    if ((!parsed.zoneIdNormalized && !parsed.zoneName) || !parsed.imei || !parsed.type) {
      await updateIncomingRecord(incomingRecordId, {
        processingStatus: 'rejected',
        errorMessage: 'missing required fields',
      });
      await updateTrackingIngressRecord(trackingIngressId, {
        status: 'rejected',
        processedAt: new Date(),
        errorMessage: 'missing required fields',
      });
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    if (parsed.type !== 'zone_in' && parsed.type !== 'zone_out') {
      await updateIncomingRecord(incomingRecordId, {
        processingStatus: 'rejected',
        errorMessage: 'unsupported event type',
      });
      await updateTrackingIngressRecord(trackingIngressId, {
        status: 'rejected',
        processedAt: new Date(),
        errorMessage: 'unsupported event type',
      });
      return NextResponse.json({ error: 'نوع حدث غير مدعوم' }, { status: 400 });
    }

    const zoneEventType = parsed.type as ZoneEventType;

    if (parsed.eventId) {
      const duplicateFilter: Record<string, unknown> = {
        atharEventId: parsed.eventId,
        type: zoneEventType,
      };
      if (parsed.zoneIdNormalized) {
        duplicateFilter.zoneId = parsed.zoneIdNormalized;
      }

      const duplicate = await ZoneEvent.findOne(duplicateFilter)
        .select('_id branchId')
        .lean();

      if (duplicate) {
        await updateIncomingRecord(incomingRecordId, {
          processingStatus: 'duplicate',
          branchId: duplicate.branchId,
          zoneEventId: duplicate._id,
          errorMessage: null,
        });
        await updateTrackingIngressRecord(trackingIngressId, {
          branchId: duplicate.branchId,
          status: 'duplicate',
          processedAt: new Date(),
          errorMessage: null,
        });
        return NextResponse.json({ success: true, duplicate: true });
      }
    }

    const vehicleMatchers = [{ imei: parsed.imei }, ...(parsed.plateNumber ? [{ plateNumber: parsed.plateNumber }] : [])];
    let vehicle: any = await Vehicle.findOne({ $or: vehicleMatchers }).lean();
    let branchId: string | null = vehicle?.branchId ? String(vehicle.branchId) : null;

    if (!branchId && parsed.imei) {
      branchId = await resolveBranchIdByAtharImei(parsed.imei);
    }

    let point: any = await resolveAtharPoint({
      branchId,
      zoneIdRaw: parsed.zoneIdRaw,
      zoneIdNormalized: parsed.zoneIdNormalized,
      zoneName: parsed.zoneName,
      desc: parsed.desc,
    });

    if (point?.branchId) {
      const pointBranchId = String(point.branchId);
      if (branchId !== pointBranchId) {
        branchId = pointBranchId;
        vehicle =
          (await Vehicle.findOne({
            branchId,
            $or: vehicleMatchers,
          }).lean()) || vehicle;
      }
    }

    if (branchId && !vehicle) {
      vehicle = await Vehicle.findOne({
        branchId,
        $or: vehicleMatchers,
      }).lean();
    }

    if (!point && branchId) {
      point = await resolveAtharPoint({
        branchId,
        zoneIdRaw: parsed.zoneIdRaw,
        zoneIdNormalized: parsed.zoneIdNormalized,
        zoneName: parsed.zoneName,
        desc: parsed.desc,
      });
    }

    const resolvedZoneId =
      (typeof point?.zoneId === 'string' && point.zoneId.trim()) ||
      parsed.zoneIdNormalized ||
      extractNumericZoneId(parsed.desc) ||
      null;

    if (!branchId) {
      await updateIncomingRecord(incomingRecordId, {
        processingStatus: 'rejected',
        errorMessage: 'branch not found',
      });
      await updateTrackingIngressRecord(trackingIngressId, {
        status: 'rejected',
        processedAt: new Date(),
        errorMessage: 'branch not found',
      });
      return NextResponse.json({ error: 'لم يتم العثور على الفرع' }, { status: 404 });
    }

    if (!vehicle) {
      return rejectAtharEvent({
        incomingRecordId,
        trackingIngressId,
        branchId,
        message: 'vehicle_not_found',
      });
    }

    const acceptedProviders = normalizeAcceptedProviders(vehicle);
    if (!acceptedProviders.includes('athar')) {
      return rejectAtharEvent({
        incomingRecordId,
        trackingIngressId,
        branchId,
        vehicleId: String(vehicle._id),
        message: 'vehicle_not_accepting_athar',
      });
    }

    if (normalizeZoneEventProvider(vehicle) !== 'athar') {
      return rejectAtharEvent({
        incomingRecordId,
        trackingIngressId,
        branchId,
        vehicleId: String(vehicle._id),
        message: 'vehicle_zone_event_provider_mismatch',
      });
    }

    const legacyFallbackEnabled = await trackingEventDefinitionService.isLegacyFallbackEnabled(branchId, 'athar');
    const matchingDefinition = point?._id
      ? await trackingEventDefinitionService.findMatchingActiveDefinition({
          branchId,
          vehicleId: String(vehicle._id),
          pointId: String(point._id),
          providerTarget: 'athar',
          eventType: zoneEventType,
        })
      : null;

    if (!matchingDefinition && !legacyFallbackEnabled) {
      return rejectAtharEvent({
        incomingRecordId,
        trackingIngressId,
        branchId,
        vehicleId: String(vehicle._id),
        message: 'rejected_local_policy',
      });
    }

    const processedEventTimestamp = parseFlexibleTimestamp(parsed.timestampRaw) || new Date();
    let processedDriver: any = null;

    if (vehicle?.driverId) {
      processedDriver = await Driver.findById(vehicle.driverId).select('name').lean();
    }

    const processedPointName =
      point?.nameAr ||
      point?.name ||
      normalizeZoneLabel(parsed.zoneName) ||
      normalizeZoneLabel(parsed.zoneIdNormalized) ||
      normalizeZoneLabel(extractNumericZoneId(parsed.desc)) ||
      'نقطة غير معروفة';
    const processedEventName = `${processedPointName} - ${zoneEventType === 'zone_in' ? 'دخول' : 'خروج'}`;

    const processedZoneEvent = await trackingEventProcessor.processZoneTransition({
      branchId,
      provider: 'athar',
      providerEventId: parsed.eventId || null,
      definitionId: matchingDefinition?._id ? String(matchingDefinition._id) : null,
      type: zoneEventType,
      eventTimestamp: processedEventTimestamp,
      vehicle,
      point,
      zoneId: resolvedZoneId,
      imei: parsed.imei,
      rawPayload: parsed.rawPayload,
      eventName: processedEventName,
      driverName: processedDriver?.name || null,
    });

    await updateIncomingRecord(incomingRecordId, {
      processingStatus: 'processed',
      branchId,
      zoneEventId: processedZoneEvent._id,
      errorMessage: null,
    });
    await updateTrackingIngressRecord(trackingIngressId, {
      branchId,
      vehicleId: vehicle?._id || null,
      status: 'processed',
      processedAt: new Date(),
      errorMessage: null,
    });

    return NextResponse.json({
      success: true,
      duplicate: false,
      definitionMatched: Boolean(matchingDefinition),
      legacyFallbackUsed: !matchingDefinition && legacyFallbackEnabled,
    });
  } catch (error: any) {
    console.error('[Athar Webhook] processing error:', error);
    if (incomingRecordId) {
      await updateIncomingRecord(incomingRecordId, {
        processingStatus: 'error',
        errorMessage: error?.message || 'internal error',
      });
    }
    await updateTrackingIngressRecord(trackingIngressId, {
      status: 'error',
      processedAt: new Date(),
      errorMessage: error?.message || 'internal error',
    });
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
