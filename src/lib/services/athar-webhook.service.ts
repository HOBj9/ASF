import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import IncomingAtharEvent from '@/models/IncomingAtharEvent';
import Branch from '@/models/Branch';
import Point from '@/models/Point';
import Vehicle from '@/models/Vehicle';
import Driver from '@/models/Driver';
import ZoneEvent from '@/models/ZoneEvent';
import PointVisit from '@/models/PointVisit';
import PointCompletion from '@/models/PointCompletion';
import { getZonedDateString } from '@/lib/utils/timezone.util';
import { getZoneEventFeedItemById } from '@/lib/services/zone-event-feed.service';
import { publishZoneEventUpdate } from '@/lib/services/zone-event-stream-bus.service';

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

function extractNumericZoneId(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  const fullNumber = normalized.match(/^(\d+)$/);
  if (fullNumber) return fullNumber[1];
  const embedded = normalized.match(/(\d+)/);
  return embedded ? embedded[1] : normalized;
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
  const branch = await Branch.findById(branchId).select('atharKey').lean();
  const atharKey = typeof branch?.atharKey === 'string' ? branch.atharKey.trim() : '';
  if (!atharKey) return [];

  const url = new URL(process.env.ATHAR_BASE_URL || 'https://admin.alather.net/api/api.php');
  url.searchParams.set('cmd', 'USER_GET_OBJECTS');
  url.searchParams.set('api', process.env.ATHAR_API_TYPE || 'user');
  url.searchParams.set('ver', process.env.ATHAR_VERSION || '1.0');
  url.searchParams.set('key', atharKey);

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
    zoneName,
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

export async function handleAtharWebhookRequest(
  request: Request,
  method: WebhookMethod
): Promise<NextResponse> {
  await connectDB();

  let incomingRecordId: string | null = null;

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

    const configuredSecret = process.env.ATHAR_WEBHOOK_SECRET || '';
    if (configuredSecret && parsed.secret !== configuredSecret) {
      await updateIncomingRecord(incomingRecordId, {
        processingStatus: 'rejected',
        errorMessage: 'unauthorized',
      });
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    if (!parsed.zoneIdNormalized || !parsed.imei || !parsed.type) {
      await updateIncomingRecord(incomingRecordId, {
        processingStatus: 'rejected',
        errorMessage: 'missing required fields',
      });
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    if (parsed.type !== 'zone_in' && parsed.type !== 'zone_out') {
      await updateIncomingRecord(incomingRecordId, {
        processingStatus: 'rejected',
        errorMessage: 'unsupported event type',
      });
      return NextResponse.json({ error: 'نوع حدث غير مدعوم' }, { status: 400 });
    }

    const zoneEventType = parsed.type as ZoneEventType;

    if (parsed.eventId) {
      const duplicate = await ZoneEvent.findOne({
        atharEventId: parsed.eventId,
        zoneId: parsed.zoneIdNormalized,
        type: zoneEventType,
      })
        .select('_id branchId')
        .lean();

      if (duplicate) {
        await updateIncomingRecord(incomingRecordId, {
          processingStatus: 'duplicate',
          branchId: duplicate.branchId,
          zoneEventId: duplicate._id,
          errorMessage: null,
        });
        return NextResponse.json({ success: true, duplicate: true });
      }
    }

    const zoneCandidates = [parsed.zoneIdNormalized, parsed.zoneName].filter(Boolean);
    const zoneIdsToTry = [...new Set(zoneCandidates.map((z) => extractNumericZoneId(z) || z).filter(Boolean))];
    let point: any = null;
    for (const zid of zoneIdsToTry) {
      point = await Point.findOne({ zoneId: zid }).lean();
      if (point) break;
    }
    if (!point && zoneIdsToTry.length > 0) {
      console.log('[Athar Webhook] Point not found for zone_id:', {
        zoneIdNormalized: parsed.zoneIdNormalized,
        zoneName: parsed.zoneName,
        zoneIdsTried: zoneIdsToTry,
      });
    }
    let branchId: string | null = point?.branchId ? String(point.branchId) : null;
    let vehicle: any = null;

    if (branchId) {
      vehicle = await Vehicle.findOne({
        branchId,
        $or: [{ imei: parsed.imei }, ...(parsed.plateNumber ? [{ plateNumber: parsed.plateNumber }] : [])],
      }).lean();
    } else {
      vehicle = await Vehicle.findOne({
        $or: [{ imei: parsed.imei }, ...(parsed.plateNumber ? [{ plateNumber: parsed.plateNumber }] : [])],
      }).lean();
      branchId = vehicle?.branchId ? String(vehicle.branchId) : null;
    }

    if (!branchId && parsed.imei) {
      branchId = await resolveBranchIdByAtharImei(parsed.imei);
    }

    if (branchId && !vehicle) {
      vehicle = await Vehicle.findOne({
        branchId,
        $or: [{ imei: parsed.imei }, ...(parsed.plateNumber ? [{ plateNumber: parsed.plateNumber }] : [])],
      }).lean();
    }

    if (!branchId) {
      await updateIncomingRecord(incomingRecordId, {
        processingStatus: 'rejected',
        errorMessage: 'branch not found',
      });
      return NextResponse.json({ error: 'لم يتم العثور على الفرع' }, { status: 404 });
    }

    const eventTimestamp = parseFlexibleTimestamp(parsed.timestampRaw) || new Date();
    let driver: any = null;

    if (vehicle?.driverId) {
      driver = await Driver.findById(vehicle.driverId).select('name').lean();
    }

    const pointName =
      point?.nameAr ||
      point?.name ||
      normalizeZoneLabel(parsed.zoneName) ||
      normalizeZoneLabel(parsed.zoneIdNormalized) ||
      normalizeZoneLabel(extractNumericZoneId(parsed.desc)) ||
      'نقطة غير معروفة';
    const eventName = `${pointName} - ${zoneEventType === 'zone_in' ? 'دخول' : 'خروج'}`;

    let zoneEvent: any = await ZoneEvent.create({
      branchId,
      vehicleId: vehicle?._id || null,
      driverId: vehicle?.driverId || null,
      pointId: point?._id || null,
      zoneId: parsed.zoneIdNormalized,
      imei: parsed.imei,
      atharEventId: parsed.eventId || null,
      name: eventName,
      driverName: driver?.name || null,
      type: zoneEventType,
      eventTimestamp,
      rawPayload: parsed.rawPayload,
    });

    if (zoneEventType === 'zone_in' && point?._id && vehicle?._id) {
      const existingVisit = await PointVisit.findOne({
        branchId,
        vehicleId: vehicle._id,
        pointId: point._id,
        status: 'open',
      }).lean();

      if (existingVisit) {
        await ZoneEvent.findByIdAndUpdate(zoneEvent._id, { isRepeatedEntry: true });
        const durationSeconds = Math.max(
          0,
          Math.floor((eventTimestamp.getTime() - new Date(existingVisit.entryTime).getTime()) / 1000)
        );
        await PointVisit.findByIdAndUpdate(existingVisit._id, {
          exitEventId: zoneEvent._id,
          exitTime: eventTimestamp,
          durationSeconds,
          status: 'closed',
          visitKind: 'repeated',
        });
      }
      await PointVisit.create({
        branchId,
        vehicleId: vehicle._id,
        pointId: point._id,
        zoneId: parsed.zoneIdNormalized,
        entryEventId: zoneEvent._id,
        entryTime: eventTimestamp,
        status: 'open',
      });
    }

    if (zoneEventType === 'zone_out' && point?._id && vehicle?._id) {
      const openVisit = await PointVisit.findOne({
        branchId,
        vehicleId: vehicle._id,
        pointId: point._id,
        status: 'open',
      })
        .sort({ entryTime: -1 })
        .exec();

      if (openVisit) {
        const durationSeconds = Math.max(
          0,
          Math.floor((eventTimestamp.getTime() - openVisit.entryTime.getTime()) / 1000)
        );

        openVisit.exitEventId = zoneEvent._id;
        openVisit.exitTime = eventTimestamp;
        openVisit.durationSeconds = durationSeconds;
        openVisit.status = 'closed';

        const branch = await Branch.findById(branchId).select('timezone').lean();
        const timeZone = branch?.timezone || 'Asia/Riyadh';
        const completionDate = getZonedDateString(timeZone, eventTimestamp);
        const existingCompletion = await PointCompletion.findOne({
          branchId,
          pointId: point._id,
          completionDate,
        }).lean();
        if (!existingCompletion) {
          await PointCompletion.create({
            branchId,
            pointId: point._id,
            completionDate,
            pointVisitId: openVisit._id,
            completedAt: eventTimestamp,
          });
          openVisit.visitKind = 'first';
        } else {
          openVisit.visitKind = 'repeated';
        }
        await openVisit.save();
      } else {
        // لا توجد زيارة مفتوحة: البحث عن zone_in مطابق وإنشاء زيارة استرجاعية
        const zoneIdsToMatch = [
          parsed.zoneIdNormalized,
          ...zoneIdsToTry.filter((z) => z !== parsed.zoneIdNormalized),
        ].filter(Boolean);
        const matchingEntry = await ZoneEvent.findOne({
          branchId,
          $or: [{ vehicleId: vehicle._id }, { imei: parsed.imei }],
          type: 'zone_in',
          zoneId: { $in: zoneIdsToMatch },
          eventTimestamp: { $lt: eventTimestamp },
          _id: { $ne: zoneEvent._id },
        })
          .sort({ eventTimestamp: -1 })
          .lean();

        const alreadyUsed =
          matchingEntry &&
          (await PointVisit.exists({ entryEventId: matchingEntry._id }));

        if (matchingEntry && !alreadyUsed) {
          const entryTime = new Date(matchingEntry.eventTimestamp);
          const durationSeconds = Math.max(
            0,
            Math.floor((eventTimestamp.getTime() - entryTime.getTime()) / 1000)
          );
          const newVisit = await PointVisit.create({
            branchId,
            vehicleId: vehicle._id,
            pointId: point._id,
            zoneId: parsed.zoneIdNormalized,
            entryEventId: matchingEntry._id,
            exitEventId: zoneEvent._id,
            entryTime,
            exitTime: eventTimestamp,
            durationSeconds,
            status: 'closed',
          });

          const branch = await Branch.findById(branchId).select('timezone').lean();
          const timeZone = branch?.timezone || 'Asia/Riyadh';
          const completionDate = getZonedDateString(timeZone, eventTimestamp);
          const existingCompletion = await PointCompletion.findOne({
            branchId,
            pointId: point._id,
            completionDate,
          }).lean();
          if (!existingCompletion) {
            await PointCompletion.create({
              branchId,
              pointId: point._id,
              completionDate,
              pointVisitId: newVisit._id,
              completedAt: eventTimestamp,
            });
            await PointVisit.findByIdAndUpdate(newVisit._id, { visitKind: 'first' });
          } else {
            await PointVisit.findByIdAndUpdate(newVisit._id, { visitKind: 'repeated' });
          }
        } else {
          await ZoneEvent.findByIdAndUpdate(zoneEvent._id, { isOrphanExit: true });
        }
      }
    }

    const streamItem = await getZoneEventFeedItemById(branchId, String(zoneEvent._id));
    if (streamItem) {
      publishZoneEventUpdate(branchId, streamItem);
    }

    await updateIncomingRecord(incomingRecordId, {
      processingStatus: 'processed',
      branchId,
      zoneEventId: zoneEvent._id,
      errorMessage: null,
    });

    return NextResponse.json({ success: true, duplicate: false });
  } catch (error: any) {
    console.error('[Athar Webhook] processing error:', error);
    if (incomingRecordId) {
      await updateIncomingRecord(incomingRecordId, {
        processingStatus: 'error',
        errorMessage: error?.message || 'internal error',
      });
    }
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

