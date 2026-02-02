import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ZoneEvent from '@/models/ZoneEvent';
import Point from '@/models/Point';
import Vehicle from '@/models/Vehicle';
import PointVisit from '@/models/PointVisit';
import Driver from '@/models/Driver';

function cleanZoneId(zoneId: string | null): string | null {
  if (!zoneId) return null;
  const match = zoneId.match(/^(\d+)/);
  return match ? match[1] : zoneId;
}

function parseEventTimestamp(timestamp?: string | null): Date | null {
  if (!timestamp) return null;
  const numeric = Number(timestamp);
  if (!Number.isFinite(numeric)) return null;
  if (timestamp.length <= 10) {
    return new Date(numeric * 1000);
  }
  return new Date(numeric);
}

async function handleWebhook(request: Request, method: 'GET' | 'POST') {
  console.log('[Athar Webhook] handleWebhook method=', method);
  await connectDB();

  let eventId: string | null = null;
  let zoneId: string | null = null;
  let imei: string | null = null;
  let type: string | null = null;
  let timestamp: string | null = null;
  let rawPayload: any = null;

  if (method === 'GET') {
    const { searchParams } = new URL(request.url);
    eventId = searchParams.get('event_id');
    zoneId = cleanZoneId(searchParams.get('zone_id'));
    imei = searchParams.get('imei');
    type = searchParams.get('type');
    timestamp = searchParams.get('timestamp');
    rawPayload = Object.fromEntries(searchParams.entries());
    const configuredSecret = process.env.ATHAR_WEBHOOK_SECRET || '';
    if (configuredSecret) {
      const incomingSecret = searchParams.get('secret');
      if (incomingSecret !== configuredSecret) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      }
    }
  } else {
    const body = await request.json().catch(() => ({}));
    const { searchParams } = new URL(request.url);
    eventId = body.event_id || body.eventId || searchParams.get('event_id');
    zoneId = cleanZoneId(body.zone_id || body.zoneId || searchParams.get('zone_id'));
    imei = body.imei || searchParams.get('imei');
    type = body.type || searchParams.get('type');
    timestamp = body.timestamp || searchParams.get('timestamp');
    rawPayload = body;
    const configuredSecret = process.env.ATHAR_WEBHOOK_SECRET || '';
    if (configuredSecret) {
      const incomingSecret = body.secret || searchParams.get('secret');
      if (incomingSecret !== configuredSecret) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      }
    }
  }

  console.log('[Athar Webhook] parsed: eventId=', eventId, 'zoneId=', zoneId, 'imei=', imei, 'type=', type);

  if (!zoneId || !imei || !type) {
    console.log('[Athar Webhook] missing required fields');
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
  }
  if (type !== 'zone_in' && type !== 'zone_out') {
    console.log('[Athar Webhook] unsupported type=', type);
    return NextResponse.json({ error: 'نوع حدث غير مدعوم' }, { status: 400 });
  }

  const existing = await ZoneEvent.findOne({
    atharEventId: eventId || null,
    zoneId,
  }).lean();
  if (existing) {
    console.log('[Athar Webhook] event already processed, skipping');
    return NextResponse.json({ success: true, message: 'event already processed' });
  }

  const point = await Point.findOne({ zoneId }).lean();
  console.log('[Athar Webhook] point=', point?._id, 'name=', point?.name);
  let branchId = point?.branchId || null;
  let vehicle = null;
  let driver = null;

  if (branchId) {
    vehicle = await Vehicle.findOne({ branchId, imei }).lean();
  } else {
    vehicle = await Vehicle.findOne({ imei }).lean();
    branchId = vehicle?.branchId || null;
  }

  if (!branchId) {
    return NextResponse.json({ error: 'لم يتم العثور على الفرع' }, { status: 404 });
  }

  const eventTimestamp = parseEventTimestamp(timestamp);
  if (vehicle?.driverId) {
    driver = await Driver.findById(vehicle.driverId).select('name').lean();
  }
  const eventName = `${point?.nameAr || point?.name || 'حاوية'} - ${type === 'zone_in' ? 'دخول' : 'خروج'}`;

  const zoneEvent = await ZoneEvent.create({
    branchId,
    vehicleId: vehicle?._id || null,
    driverId: vehicle?.driverId || null,
    pointId: point?._id || null,
    zoneId,
    imei,
    atharEventId: eventId || null,
    name: eventName,
    driverName: driver?.name || null,
    type,
    eventTimestamp,
    rawPayload,
  });
  console.log('[Athar Webhook] ZoneEvent created _id=', zoneEvent._id);

  if (type === 'zone_in' && point?._id && vehicle?._id && branchId) {
    const existingVisit = await PointVisit.findOne({
      branchId,
      vehicleId: vehicle._id,
      pointId: point._id,
      status: 'open',
    }).lean();

    if (!existingVisit) {
      await PointVisit.create({
        branchId,
        vehicleId: vehicle._id,
        pointId: point._id,
        zoneId,
        entryEventId: zoneEvent._id,
        entryTime: eventTimestamp || new Date(),
        status: 'open',
      });
    }
  }

  if (type === 'zone_out' && point?._id && vehicle?._id && branchId) {
    const openVisit = await PointVisit.findOne({
      branchId,
      vehicleId: vehicle._id,
      pointId: point._id,
      status: 'open',
    })
      .sort({ entryTime: -1 })
      .exec();

    if (openVisit) {
      const exitTime = eventTimestamp || new Date();
      const durationSeconds = Math.max(
        0,
        Math.floor((exitTime.getTime() - openVisit.entryTime.getTime()) / 1000)
      );

      openVisit.exitEventId = zoneEvent._id;
      openVisit.exitTime = exitTime;
      openVisit.durationSeconds = durationSeconds;
      openVisit.status = 'closed';
      await openVisit.save();
      console.log('[Athar Webhook] PointVisit closed (zone_out) durationSeconds=', durationSeconds);
    }
  }

  console.log('[Athar Webhook] done success=true');
  return NextResponse.json({ success: true });
}

export async function GET(request: Request) {
  return handleWebhook(request, 'GET');
}

export async function POST(request: Request) {
  return handleWebhook(request, 'POST');
}
