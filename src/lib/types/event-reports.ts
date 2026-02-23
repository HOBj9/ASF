export type EventReportHeader = {
  key: string;
  label: string;
};

export type EventReportScope = {
  organizationId: string | null;
  branchId: string;
};

export type VehicleEventType = 'zone_in' | 'zone_out' | 'visit';

export type VehicleEventReportRow = {
  id: string;
  source: 'point_visit' | 'zone_event';
  sourceLabel: string;
  eventTimestamp: string;
  eventType: VehicleEventType;
  eventTypeLabel: string;
  vehicleName: string;
  plateNumber: string;
  imei: string;
  pointName: string;
  zoneId: string;
  entryTime: string;
  exitTime: string;
  durationSeconds: number | null;
  status: string;
};

export type PointVehicleReportRow = {
  vehicleKey: string;
  vehicleName: string;
  plateNumber: string;
  imei: string;
  entriesCount: number;
  exitsCount: number;
  lastEntryAt: string;
  lastExitAt: string;
  totalStayDurationSeconds: number;
};

export type EventReportSummary = {
  totalRecords: number;
  totalVisits: number;
  totalEntries: number;
  totalExits: number;
  totalVehicles: number;
  totalPoints: number;
  totalStayDurationSeconds: number;
};

export type EventReportPreviewResponse<T> = {
  meta: {
    organizationId: string | null;
    branchId: string;
    from: string;
    to: string;
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  headers: EventReportHeader[];
  rows: T[];
  summary: EventReportSummary;
};
