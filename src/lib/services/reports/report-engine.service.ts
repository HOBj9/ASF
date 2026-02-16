import Branch from '@/models/Branch';
import Organization from '@/models/Organization';
import PointVisit from '@/models/PointVisit';
import { getZonedRangeByPeriod } from '@/lib/utils/timezone.util';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';
export type DurationUnit = 'seconds' | 'minutes' | 'hours';

export type ReportColumnKey =
  | 'vehicleName'
  | 'plateNumber'
  | 'pointName'
  | 'entryTime'
  | 'exitTime'
  | 'duration'
  | 'zoneId'
  | 'status';

export type GenerateReportInput = {
  branchId?: string | null;
  organizationId?: string | null;
  period: ReportPeriod;
  from?: Date | null;
  to?: Date | null;
  vehicleId?: string | null;
  pointId?: string | null;
  durationUnit?: DurationUnit;
  columns?: ReportColumnKey[];
  status?: 'all' | 'open' | 'closed';
};

type LabelsShape = {
  pointLabel: string;
  vehicleLabel: string;
};

type ReportRow = Record<string, string | number | null>;

type ReportSummary = {
  totalVisits: number;
  openVisits: number;
  closedVisits: number;
  uniqueVehicles: number;
  uniquePoints: number;
  totalDurationSeconds: number;
  averageDurationSeconds: number;
};

const DEFAULT_COLUMNS: ReportColumnKey[] = [
  'vehicleName',
  'plateNumber',
  'pointName',
  'entryTime',
  'exitTime',
  'duration',
  'status',
];

function formatDateTime(date: Date | null | undefined, timeZone: string): string {
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

function normalizeDuration(seconds: number | null | undefined, unit: DurationUnit): number | '' {
  if (seconds === null || seconds === undefined) return '';
  if (unit === 'minutes') return Number((seconds / 60).toFixed(2));
  if (unit === 'hours') return Number((seconds / 3600).toFixed(2));
  return seconds;
}

function getDurationHeader(unit: DurationUnit) {
  if (unit === 'minutes') return 'مدة البقاء (دقيقة)';
  if (unit === 'hours') return 'مدة البقاء (ساعة)';
  return 'مدة البقاء (ثانية)';
}

function resolveHeaders(
  labels: LabelsShape,
  durationUnit: DurationUnit,
  includeBranchName?: boolean
): Record<ReportColumnKey, string> & { branchName?: string } {
  const base: Record<ReportColumnKey, string> = {
    vehicleName: `اسم ${labels.vehicleLabel}`,
    plateNumber: 'رقم اللوحة',
    pointName: `اسم ${labels.pointLabel}`,
    entryTime: 'وقت الدخول',
    exitTime: 'وقت الخروج',
    duration: getDurationHeader(durationUnit),
    zoneId: 'معرف المنطقة',
    status: 'حالة الزيارة',
  };
  if (includeBranchName) {
    return { ...base, branchName: 'الفرع' };
  }
  return base;
}

function toStatusLabel(status: string | null | undefined) {
  if (status === 'open') return 'مفتوحة';
  if (status === 'closed') return 'مغلقة';
  return '';
}

export async function generateVisitsReport(input: GenerateReportInput): Promise<{
  branchId: string | null;
  organizationId?: string | null;
  timeZone: string;
  period: ReportPeriod;
  range: { start: Date; end: Date };
  headers: string[];
  rows: ReportRow[];
  summary: ReportSummary;
}> {
  const useOrgScope = !!input.organizationId && !input.branchId;
  let timeZone = 'Asia/Damascus';
  let labels: LabelsShape = { pointLabel: 'نقاط', vehicleLabel: 'مركبات' };
  let branchIds: string[] = [];

  if (useOrgScope) {
    const org = await Organization.findById(input.organizationId).select('labels').lean();
    labels = {
      pointLabel: org?.labels?.pointLabel || 'نقاط',
      vehicleLabel: org?.labels?.vehicleLabel || 'مركبات',
    };
    const branches = await Branch.find({ organizationId: input.organizationId, isActive: true })
      .select('_id timezone name nameAr')
      .lean();
    if (!branches?.length) {
      throw new Error('لا توجد فروع لهذه المؤسسة');
    }
    branchIds = branches.map((b) => String(b._id));
    timeZone = branches[0]?.timezone || timeZone;
  } else if (input.branchId) {
    const branch = await Branch.findById(input.branchId).select('timezone organizationId').lean();
    if (!branch) {
      throw new Error('الفرع غير موجود');
    }
    timeZone = branch.timezone || timeZone;
    const organization = branch.organizationId
      ? await Organization.findById(branch.organizationId).select('labels').lean()
      : null;
    labels = {
      pointLabel: organization?.labels?.pointLabel || 'نقاط',
      vehicleLabel: organization?.labels?.vehicleLabel || 'مركبات',
    };
    branchIds = [input.branchId];
  } else {
    throw new Error('يرجى تحديد الفرع أو المؤسسة');
  }

  const period = input.period || 'daily';
  const durationUnit = input.durationUnit || 'seconds';
  const selectedColumns = input.columns?.length ? input.columns : DEFAULT_COLUMNS;
  const includeBranchName = useOrgScope;
  const headersMap = resolveHeaders(labels, durationUnit, includeBranchName);
  const columnKeys = includeBranchName ? ([...selectedColumns, 'branchName'] as const) : selectedColumns;
  const headers = columnKeys.map((key) => headersMap[key as ReportColumnKey] ?? (headersMap as any).branchName);
  const range = getZonedRangeByPeriod(timeZone, period, input.from, input.to);

  const query: Record<string, any> = {
    branchId: branchIds.length === 1 ? branchIds[0] : { $in: branchIds },
    entryTime: { $lte: range.end },
    $or: [{ exitTime: { $gte: range.start } }, { exitTime: null }],
  };

  if (input.vehicleId) query.vehicleId = input.vehicleId;
  if (input.pointId) query.pointId = input.pointId;
  if (input.status && input.status !== 'all') query.status = input.status;

  const visits = await PointVisit.find(query)
    .populate('vehicleId', 'name plateNumber')
    .populate('pointId', 'name nameAr')
    .sort({ entryTime: -1 })
    .lean();

  let branchNames: Record<string, string> = {};
  if (useOrgScope && visits.length > 0) {
    const ids = [...new Set((visits as any[]).map((v) => String(v.branchId)).filter(Boolean))];
    const branches = await Branch.find({ _id: { $in: ids } }).select('name nameAr').lean();
    branchNames = Object.fromEntries(
      branches.map((b) => [String(b._id), (b as any).nameAr || (b as any).name || String(b._id)])
    );
  }

  const rows: ReportRow[] = [];
  const vehiclesSet = new Set<string>();
  const pointsSet = new Set<string>();
  let totalDurationSeconds = 0;
  let closedVisits = 0;
  let openVisits = 0;

  for (const visit of visits as any[]) {
    const vehicleId = visit.vehicleId?._id ? String(visit.vehicleId._id) : null;
    const pointId = visit.pointId?._id ? String(visit.pointId._id) : null;
    if (vehicleId) vehiclesSet.add(vehicleId);
    if (pointId) pointsSet.add(pointId);

    if (visit.status === 'closed') {
      closedVisits += 1;
      totalDurationSeconds += Number(visit.durationSeconds || 0);
    } else if (visit.status === 'open') {
      openVisits += 1;
    }

    const dataByColumn: Record<ReportColumnKey, string | number | null> = {
      vehicleName: visit.vehicleId?.name || '',
      plateNumber: visit.vehicleId?.plateNumber || '',
      pointName: visit.pointId?.nameAr || visit.pointId?.name || '',
      entryTime: formatDateTime(visit.entryTime, timeZone),
      exitTime: formatDateTime(visit.exitTime, timeZone),
      duration: normalizeDuration(visit.durationSeconds, durationUnit),
      zoneId: visit.zoneId || '',
      status: toStatusLabel(visit.status),
    };

    const row: ReportRow = {};
    selectedColumns.forEach((columnKey, index) => {
      row[headers[index]] = dataByColumn[columnKey];
    });
    if (includeBranchName && visit.branchId) {
      row[headers[headers.length - 1]] = branchNames[String(visit.branchId)] ?? String(visit.branchId);
    }
    rows.push(row);
  }

  const summary: ReportSummary = {
    totalVisits: visits.length,
    openVisits,
    closedVisits,
    uniqueVehicles: vehiclesSet.size,
    uniquePoints: pointsSet.size,
    totalDurationSeconds,
    averageDurationSeconds: closedVisits > 0 ? Math.round(totalDurationSeconds / closedVisits) : 0,
  };

  return {
    branchId: useOrgScope ? null : (branchIds[0] ?? null),
    organizationId: useOrgScope ? input.organizationId : undefined,
    timeZone,
    period,
    range,
    headers,
    rows,
    summary,
  };
}
