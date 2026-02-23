import connectDB from '@/lib/mongodb';
import Branch from '@/models/Branch';
import Point from '@/models/Point';
import PointVisit from '@/models/PointVisit';
import Vehicle from '@/models/Vehicle';
import ZoneEvent from '@/models/ZoneEvent';
import { getZonedDayRange } from '@/lib/utils/timezone.util';
import type {
  EventReportHeader,
  EventReportScope,
  EventReportSummary,
  PointVehicleReportRow,
  VehicleEventReportRow,
} from '@/lib/types/event-reports';

type DateRange = {
  from: Date;
  to: Date;
  timeZone: string;
};

type VehicleEventsReportResult = {
  scope: EventReportScope;
  range: DateRange;
  headers: EventReportHeader[];
  rows: VehicleEventReportRow[];
  summary: EventReportSummary;
};

type PointVehiclesReportResult = {
  scope: EventReportScope;
  range: DateRange;
  headers: EventReportHeader[];
  rows: PointVehicleReportRow[];
  summary: EventReportSummary;
};

type GenerateVehicleEventsReportInput = {
  scope: EventReportScope;
  vehicleId: string;
  from?: Date | null;
  to?: Date | null;
};

type GeneratePointVehiclesReportInput = {
  scope: EventReportScope;
  pointId: string;
  from?: Date | null;
  to?: Date | null;
};

type AnyDoc = Record<string, any>;

const VEHICLE_REPORT_HEADERS: EventReportHeader[] = [
  { key: 'eventTimestamp', label: 'وقت الحدث' },
  { key: 'eventTypeLabel', label: 'نوع الحدث' },
  { key: 'sourceLabel', label: 'المصدر' },
  { key: 'pointName', label: 'النقطة' },
  { key: 'zoneId', label: 'معرف المنطقة' },
  { key: 'vehicleName', label: 'اسم المركبة' },
  { key: 'plateNumber', label: 'رقم اللوحة' },
  { key: 'imei', label: 'IMEI' },
  { key: 'entryTime', label: 'وقت الدخول' },
  { key: 'exitTime', label: 'وقت الخروج' },
  { key: 'durationSeconds', label: 'مدة الزيارة (ثانية)' },
  { key: 'status', label: 'الحالة' },
];

const POINT_REPORT_HEADERS: EventReportHeader[] = [
  { key: 'vehicleName', label: 'اسم المركبة' },
  { key: 'plateNumber', label: 'رقم اللوحة' },
  { key: 'imei', label: 'IMEI' },
  { key: 'entriesCount', label: 'عدد الدخول' },
  { key: 'exitsCount', label: 'عدد الخروج' },
  { key: 'lastEntryAt', label: 'آخر دخول' },
  { key: 'lastExitAt', label: 'آخر خروج' },
  { key: 'totalStayDurationSeconds', label: 'إجمالي مدة الزيارة (ثانية)' },
];

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeZoneLabel(value: unknown): string {
  const raw = normalizeText(value);
  if (!raw) return 'نقطة غير معروفة';
  if (/^\d+$/.test(raw)) return `النقطة ${raw}`;
  return raw;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value: unknown, timeZone: string): string {
  const date = toDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('ar-SY-u-nu-latn', {
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

function formatEventTypeLabel(type: string): string {
  if (type === 'zone_in') return 'دخول';
  if (type === 'zone_out') return 'خروج';
  return 'زيارة';
}

function formatVisitStatus(status: string): string {
  if (status === 'open') return 'مفتوحة';
  if (status === 'closed') return 'مغلقة';
  return '';
}

function resolveRange(timeZone: string, from?: Date | null, to?: Date | null): DateRange {
  if (!from && !to) {
    const dayRange = getZonedDayRange(timeZone);
    return { from: dayRange.start, to: dayRange.end, timeZone };
  }
  if (!from || !to) {
    throw new Error('يرجى تحديد وقت البداية والنهاية معًا');
  }
  if (from.getTime() > to.getTime()) {
    throw new Error('وقت البداية يجب أن يكون قبل وقت النهاية');
  }
  return { from, to, timeZone };
}

function buildZoneEventTimeFilter(range: DateRange): Record<string, any> {
  return {
    $or: [
      { eventTimestamp: { $gte: range.from, $lte: range.to } },
      { eventTimestamp: null, createdAt: { $gte: range.from, $lte: range.to } },
    ],
  };
}

function buildVisitOverlapFilter(range: DateRange): Record<string, any> {
  return {
    entryTime: { $lte: range.to },
    $or: [{ exitTime: { $gte: range.from } }, { exitTime: null }],
  };
}

function createEmptySummary(): EventReportSummary {
  return {
    totalRecords: 0,
    totalVisits: 0,
    totalEntries: 0,
    totalExits: 0,
    totalVehicles: 0,
    totalPoints: 0,
    totalStayDurationSeconds: 0,
  };
}

async function getBranchTimeZone(branchId: string): Promise<string> {
  const branch = await Branch.findById(branchId).select('timezone').lean();
  if (!branch) throw new Error('الفرع غير موجود');
  return branch.timezone || 'Asia/Damascus';
}

function getZoneEventPointName(zoneEvent: AnyDoc): string {
  return normalizeZoneLabel(
    zoneEvent?.pointId?.nameAr ||
      zoneEvent?.pointId?.name ||
      zoneEvent?.rawPayload?.zone_name ||
      zoneEvent?.rawPayload?.zoneName ||
      zoneEvent?.zoneId
  );
}

function getZoneEventVehicleName(zoneEvent: AnyDoc): string {
  const rawName =
    zoneEvent?.vehicleId?.name ||
    zoneEvent?.rawPayload?.name ||
    zoneEvent?.imei ||
    zoneEvent?.rawPayload?.imei;
  return normalizeText(rawName) || 'مركبة غير معروفة';
}

function getZoneEventPlateNumber(zoneEvent: AnyDoc): string {
  return normalizeText(zoneEvent?.vehicleId?.plateNumber || zoneEvent?.rawPayload?.plate_number);
}

function getZoneEventImei(zoneEvent: AnyDoc): string {
  return normalizeText(zoneEvent?.imei || zoneEvent?.rawPayload?.imei);
}

function getZoneEventTimestamp(zoneEvent: AnyDoc): Date | null {
  return toDate(zoneEvent?.eventTimestamp) || toDate(zoneEvent?.createdAt);
}

function sortVehicleRowsDesc(rows: VehicleEventReportRow[], timeZone: string): VehicleEventReportRow[] {
  return [...rows].sort((a, b) => {
    const dateA = toDate(a.eventTimestamp) || toDate(new Date(a.eventTimestamp));
    const dateB = toDate(b.eventTimestamp) || toDate(new Date(b.eventTimestamp));
    const timeA = dateA ? dateA.getTime() : 0;
    const timeB = dateB ? dateB.getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;
    return a.id.localeCompare(b.id);
  }).map((row) => ({
    ...row,
    eventTimestamp: formatDateTime(row.eventTimestamp, timeZone),
  }));
}

export async function generateVehicleEventsReport(
  input: GenerateVehicleEventsReportInput
): Promise<VehicleEventsReportResult> {
  await connectDB();

  const timeZone = await getBranchTimeZone(input.scope.branchId);
  const range = resolveRange(timeZone, input.from, input.to);

  const vehicle = await Vehicle.findOne({
    _id: input.vehicleId,
    branchId: input.scope.branchId,
  })
    .select('name plateNumber imei')
    .lean();

  if (!vehicle) {
    throw new Error('المركبة غير موجودة ضمن الفرع المحدد');
  }

  const visitFilter = {
    branchId: input.scope.branchId,
    vehicleId: input.vehicleId,
    ...buildVisitOverlapFilter(range),
  };

  const visits = (await PointVisit.find(visitFilter)
    .populate('pointId', 'name nameAr zoneId')
    .sort({ entryTime: -1 })
    .lean()) as AnyDoc[];

  const coveredEventIds = new Set<string>();
  const visitRows: VehicleEventReportRow[] = [];
  const pointsSet = new Set<string>();
  let totalStayDurationSeconds = 0;
  let totalEntries = 0;
  let totalExits = 0;

  for (const visit of visits) {
    const entryEventId = normalizeText(visit?.entryEventId);
    const exitEventId = normalizeText(visit?.exitEventId);
    if (entryEventId) coveredEventIds.add(entryEventId);
    if (exitEventId) coveredEventIds.add(exitEventId);

    const pointName = normalizeZoneLabel(
      visit?.pointId?.nameAr || visit?.pointId?.name || visit?.zoneId
    );
    pointsSet.add(pointName);

    const entryTime = toDate(visit?.entryTime);
    const exitTime = toDate(visit?.exitTime);
    const eventTimestamp = exitTime || entryTime || new Date();
    const durationSeconds = visit?.durationSeconds ?? null;

    totalEntries += 1;
    if (exitTime) totalExits += 1;
    if (typeof durationSeconds === 'number' && Number.isFinite(durationSeconds)) {
      totalStayDurationSeconds += durationSeconds;
    }

    visitRows.push({
      id: normalizeText(visit?._id) || `${input.vehicleId}-${eventTimestamp.getTime()}`,
      source: 'point_visit',
      sourceLabel: 'زيارة محسوبة',
      eventTimestamp: eventTimestamp.toISOString(),
      eventType: 'visit',
      eventTypeLabel: 'زيارة',
      vehicleName: normalizeText(vehicle.name) || 'مركبة غير معروفة',
      plateNumber: normalizeText(vehicle.plateNumber),
      imei: normalizeText(vehicle.imei),
      pointName,
      zoneId: normalizeText(visit?.zoneId || visit?.pointId?.zoneId),
      entryTime: formatDateTime(entryTime, timeZone),
      exitTime: formatDateTime(exitTime, timeZone),
      durationSeconds: typeof durationSeconds === 'number' && Number.isFinite(durationSeconds)
        ? durationSeconds
        : null,
      status: formatVisitStatus(normalizeText(visit?.status)),
    });
  }

  const vehicleFilter: Array<Record<string, any>> = [{ vehicleId: input.vehicleId }];
  const vehicleImei = normalizeText(vehicle.imei);
  if (vehicleImei) {
    vehicleFilter.push({ imei: vehicleImei });
  }

  const zoneEvents = (await ZoneEvent.find({
    branchId: input.scope.branchId,
    $and: [{ $or: vehicleFilter }, buildZoneEventTimeFilter(range)],
  })
    .populate('pointId', 'name nameAr zoneId')
    .populate('vehicleId', 'name plateNumber imei')
    .sort({ eventTimestamp: -1, createdAt: -1 })
    .lean()) as AnyDoc[];

  const uncoveredZoneEvents = zoneEvents.filter((event) => {
    const eventId = normalizeText(event?._id);
    return !coveredEventIds.has(eventId);
  });

  const zoneEventRows: VehicleEventReportRow[] = uncoveredZoneEvents.map((event) => {
    const timestamp = getZoneEventTimestamp(event) || new Date();
    const eventType = normalizeText(event?.type) === 'zone_out' ? 'zone_out' : 'zone_in';
    const pointName = getZoneEventPointName(event);
    pointsSet.add(pointName);

    if (eventType === 'zone_in') totalEntries += 1;
    if (eventType === 'zone_out') totalExits += 1;

    return {
      id: normalizeText(event?._id) || `zone-event-${timestamp.getTime()}`,
      source: 'zone_event',
      sourceLabel: 'حدث مباشر',
      eventTimestamp: timestamp.toISOString(),
      eventType,
      eventTypeLabel: formatEventTypeLabel(eventType),
      vehicleName: getZoneEventVehicleName(event),
      plateNumber: getZoneEventPlateNumber(event),
      imei: getZoneEventImei(event),
      pointName,
      zoneId: normalizeText(event?.zoneId || event?.rawPayload?.zone_name),
      entryTime: eventType === 'zone_in' ? formatDateTime(timestamp, timeZone) : '',
      exitTime: eventType === 'zone_out' ? formatDateTime(timestamp, timeZone) : '',
      durationSeconds: null,
      status: '',
    };
  });

  const rows = sortVehicleRowsDesc([...visitRows, ...zoneEventRows], timeZone);

  const summary: EventReportSummary = {
    totalRecords: rows.length,
    totalVisits: visits.length,
    totalEntries,
    totalExits,
    totalVehicles: rows.length ? 1 : 0,
    totalPoints: pointsSet.size,
    totalStayDurationSeconds,
  };

  return {
    scope: input.scope,
    range,
    headers: VEHICLE_REPORT_HEADERS,
    rows,
    summary,
  };
}

export async function generatePointVehiclesReport(
  input: GeneratePointVehiclesReportInput
): Promise<PointVehiclesReportResult> {
  await connectDB();

  const timeZone = await getBranchTimeZone(input.scope.branchId);
  const range = resolveRange(timeZone, input.from, input.to);

  const point = await Point.findOne({
    _id: input.pointId,
    branchId: input.scope.branchId,
  })
    .select('name nameAr zoneId')
    .lean();

  if (!point) {
    throw new Error('النقطة غير موجودة ضمن الفرع المحدد');
  }

  const zoneMatchers: Array<Record<string, any>> = [{ pointId: input.pointId }];
  const pointZoneId = normalizeText(point.zoneId);
  if (pointZoneId) {
    zoneMatchers.push({ zoneId: pointZoneId });
  }

  const zoneEvents = (await ZoneEvent.find({
    branchId: input.scope.branchId,
    $and: [{ $or: zoneMatchers }, buildZoneEventTimeFilter(range)],
  })
    .populate('vehicleId', 'name plateNumber imei')
    .populate('pointId', 'name nameAr zoneId')
    .sort({ eventTimestamp: -1, createdAt: -1 })
    .lean()) as AnyDoc[];

  const visitFilter = {
    branchId: input.scope.branchId,
    pointId: input.pointId,
    ...buildVisitOverlapFilter(range),
  };

  const visits = (await PointVisit.find(visitFilter)
    .populate('vehicleId', 'name plateNumber imei')
    .sort({ entryTime: -1 })
    .lean()) as AnyDoc[];

  type AggregatedRow = PointVehicleReportRow & {
    _lastEntryAtDate: Date | null;
    _lastExitAtDate: Date | null;
  };

  const byVehicle = new Map<string, AggregatedRow>();

  const getOrCreate = (
    key: string,
    defaults: { vehicleName: string; plateNumber: string; imei: string }
  ): AggregatedRow => {
    const existing = byVehicle.get(key);
    if (existing) return existing;

    const created: AggregatedRow = {
      vehicleKey: key,
      vehicleName: defaults.vehicleName || 'مركبة غير معروفة',
      plateNumber: defaults.plateNumber || '',
      imei: defaults.imei || '',
      entriesCount: 0,
      exitsCount: 0,
      lastEntryAt: '',
      lastExitAt: '',
      totalStayDurationSeconds: 0,
      _lastEntryAtDate: null,
      _lastExitAtDate: null,
    };
    byVehicle.set(key, created);
    return created;
  };

  for (const event of zoneEvents) {
    const vehicleId = normalizeText(event?.vehicleId?._id);
    const imei = getZoneEventImei(event);
    const key = vehicleId ? `vehicle:${vehicleId}` : imei ? `imei:${imei}` : `event:${normalizeText(event?._id)}`;
    const row = getOrCreate(key, {
      vehicleName: getZoneEventVehicleName(event),
      plateNumber: getZoneEventPlateNumber(event),
      imei,
    });

    const eventTime = getZoneEventTimestamp(event);
    const eventType = normalizeText(event?.type);
    if (eventType === 'zone_in') {
      row.entriesCount += 1;
      if (eventTime && (!row._lastEntryAtDate || eventTime > row._lastEntryAtDate)) {
        row._lastEntryAtDate = eventTime;
        row.lastEntryAt = formatDateTime(eventTime, timeZone);
      }
    } else if (eventType === 'zone_out') {
      row.exitsCount += 1;
      if (eventTime && (!row._lastExitAtDate || eventTime > row._lastExitAtDate)) {
        row._lastExitAtDate = eventTime;
        row.lastExitAt = formatDateTime(eventTime, timeZone);
      }
    }
  }

  for (const visit of visits) {
    const vehicleId = normalizeText(visit?.vehicleId?._id);
    const imei = normalizeText(visit?.vehicleId?.imei);
    const key = vehicleId ? `vehicle:${vehicleId}` : imei ? `imei:${imei}` : '';
    if (!key) continue;

    const row = getOrCreate(key, {
      vehicleName: normalizeText(visit?.vehicleId?.name),
      plateNumber: normalizeText(visit?.vehicleId?.plateNumber),
      imei,
    });

    const durationSeconds = Number(visit?.durationSeconds || 0);
    if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
      row.totalStayDurationSeconds += durationSeconds;
    }
  }

  const rows = Array.from(byVehicle.values())
    .sort((a, b) => {
      const activityA = Math.max(
        a._lastEntryAtDate ? a._lastEntryAtDate.getTime() : 0,
        a._lastExitAtDate ? a._lastExitAtDate.getTime() : 0
      );
      const activityB = Math.max(
        b._lastEntryAtDate ? b._lastEntryAtDate.getTime() : 0,
        b._lastExitAtDate ? b._lastExitAtDate.getTime() : 0
      );
      if (activityA !== activityB) return activityB - activityA;
      return b.entriesCount + b.exitsCount - (a.entriesCount + a.exitsCount);
    })
    .map(({ _lastEntryAtDate: _ignoreEntry, _lastExitAtDate: _ignoreExit, ...row }) => row);

  const summary = createEmptySummary();
  summary.totalRecords = rows.length;
  summary.totalVehicles = rows.length;
  summary.totalPoints = rows.length ? 1 : 0;
  summary.totalVisits = visits.length;
  summary.totalEntries = rows.reduce((acc, row) => acc + row.entriesCount, 0);
  summary.totalExits = rows.reduce((acc, row) => acc + row.exitsCount, 0);
  summary.totalStayDurationSeconds = rows.reduce(
    (acc, row) => acc + row.totalStayDurationSeconds,
    0
  );

  return {
    scope: input.scope,
    range,
    headers: POINT_REPORT_HEADERS,
    rows,
    summary,
  };
}

export function mapRowsToCsvRows<T extends Record<string, unknown>>(
  rows: T[],
  headers: EventReportHeader[]
): Array<Record<string, unknown>> {
  const output: Array<Record<string, unknown>> = [];
  for (const row of rows) {
    const formatted: Record<string, unknown> = {};
    for (const header of headers) {
      formatted[header.label] = row[header.key] ?? '';
    }
    output.push(formatted);
  }
  return output;
}

