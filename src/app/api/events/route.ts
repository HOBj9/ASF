import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { resolveMunicipalityId } from '@/lib/utils/municipality.util';
import ZoneEvent from '@/models/ZoneEvent';
import Municipality from '@/models/Municipality';
import { permissionActions, permissionResources } from '@/constants/permissions';

function formatDateTime(date: Date | null | undefined, timeZone: string): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.EVENTS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const municipalityId = resolveMunicipalityId(session, searchParams.get('municipalityId'));
    const limit = Math.min(Number(searchParams.get('limit') || 10), 50);

    const municipality = await Municipality.findById(municipalityId).select('timezone').lean();
    const timezone = municipality?.timezone || 'Asia/Damascus';

    const events = await ZoneEvent.find({ municipalityId })
      .sort({ eventTimestamp: -1, createdAt: -1 })
      .limit(limit)
      .populate('pointId', 'name nameAr')
      .populate('vehicleId', 'name plateNumber driverId')
      .populate('driverId', 'name')
      .lean();

    const result = events.map((event: any) => ({
      _id: event._id.toString(),
      type: event.type,
      name: event.name || '',
      imei: event.imei || '',
      eventTimestamp: formatDateTime(event.eventTimestamp || event.createdAt, timezone),
      pointName: event.pointId?.nameAr || event.pointId?.name || '',
      vehicleName: event.vehicleId?.name || '',
      driverName: event.driverName || event.driverId?.name || '',
    }));

    return NextResponse.json({ events: result });
  } catch (error: any) {
    return handleApiError(error);
  }
}
