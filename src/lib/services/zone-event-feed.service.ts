import Branch from '@/models/Branch';
import ZoneEvent from '@/models/ZoneEvent';
import type { DashboardEventItem } from '@/lib/types/dashboard-event';

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

function buildDisplayText(type: string, vehicleName: string, imei: string, pointName: string): string {
  const vehicleLabel = vehicleName || imei || 'مركبة غير معروفة';
  const pointLabelRaw = pointName || 'غير معروفة';
  const pointLabel = pointLabelRaw.startsWith('النقطة') ? pointLabelRaw : `النقطة ${pointLabelRaw}`;
  if (type === 'zone_out') {
    return `خرجت المركبة ${vehicleLabel} من ${pointLabel}`;
  }
  return `دخلت المركبة ${vehicleLabel} إلى ${pointLabel}`;
}

function normalizePointLabel(raw: string): string {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^\d+$/.test(value)) return `النقطة ${value}`;
  return value;
}

export async function getBranchTimezone(branchId: string): Promise<string | null> {
  const branch = await Branch.findById(branchId).select('timezone').lean();
  if (!branch) return null;
  return branch.timezone || 'Asia/Damascus';
}

export function mapZoneEventToDashboardItem(event: any, timeZone: string): DashboardEventItem {
  const pointName = normalizePointLabel(
    event?.pointId?.nameAr ||
      event?.pointId?.name ||
      event?.rawPayload?.zone_name ||
      event?.rawPayload?.zoneName ||
      event?.zoneId ||
      ''
  );
  const vehicleName = event?.vehicleId?.name || event?.rawPayload?.name || '';
  const imei = event?.imei || '';
  const eventDate: Date | null = event?.eventTimestamp || event?.createdAt || null;

  const pointId = event?.pointId != null ? String(event.pointId) : '';
  return {
    _id: String(event?._id),
    type: event?.type || '',
    name: event?.name || '',
    imei,
    eventTimestamp: formatDateTime(eventDate, timeZone),
    pointName,
    vehicleName,
    driverName: event?.driverName || event?.driverId?.name || '',
    displayText: buildDisplayText(event?.type || '', vehicleName, imei, pointName),
    ...(pointId ? { pointId } : {}),
  };
}

export async function getRecentBranchEvents(
  branchId: string,
  limit: number,
  timeZone?: string,
  skip?: number
): Promise<DashboardEventItem[]> {
  const resolvedTimeZone = timeZone || (await getBranchTimezone(branchId)) || 'Asia/Damascus';
  const events = await ZoneEvent.find({ branchId })
    .sort({ eventTimestamp: -1, createdAt: -1 })
    .skip(skip ?? 0)
    .limit(limit)
    .populate('pointId', 'name nameAr')
    .populate('vehicleId', 'name plateNumber driverId')
    .populate('driverId', 'name')
    .lean();

  return events.map((event: any) => mapZoneEventToDashboardItem(event, resolvedTimeZone));
}

export async function getZoneEventFeedItemById(
  branchId: string,
  zoneEventId: string,
  timeZone?: string
): Promise<DashboardEventItem | null> {
  const resolvedTimeZone = timeZone || (await getBranchTimezone(branchId)) || 'Asia/Damascus';
  const event = await ZoneEvent.findOne({ _id: zoneEventId, branchId })
    .populate('pointId', 'name nameAr')
    .populate('vehicleId', 'name plateNumber driverId')
    .populate('driverId', 'name')
    .lean();

  if (!event) return null;
  return mapZoneEventToDashboardItem(event, resolvedTimeZone);
}
