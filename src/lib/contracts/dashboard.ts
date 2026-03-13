import type { Labels } from "@/lib/utils/labels.util";
import type { DashboardEventItem } from "@/lib/types/dashboard-event";

export type DashboardBranchSummary = {
  _id: string;
  name?: string;
  nameAr?: string;
};

export type DashboardBranchInfo = {
  _id: string;
  name: string;
  addressText?: string;
  centerLat: number;
  centerLng: number;
  timezone: string;
};

export type DashboardRouteSummary = {
  _id: string;
  name: string;
  path?: {
    type: "LineString";
    coordinates: number[][];
  };
};

export type DashboardStats = {
  activeVehicles: number;
  activePoints: number;
  dailyCompletionPercent: number;
  totalPoints: number;
  visitedPointsToday: number;
};

export type DashboardAnalytics = {
  daily: Array<{ date: string; containers: number; events: number; avgMinutes: number }>;
  monthly: Array<{ month: string; containers: number }>;
  vehicleStatus?: { active: number; inactive: number };
  pointTypes?: Array<{ type: string; label: string; count: number }>;
  eventsByType?: Record<string, number>;
};

export type DashboardOverviewData = {
  branch: DashboardBranchInfo | null;
  routes: DashboardRouteSummary[];
  stats: DashboardStats | null;
  analytics: DashboardAnalytics | null;
  events: DashboardEventItem[];
  eventsHasMore: boolean;
  labels: Labels;
  organizationName: string;
  orgBranches: DashboardBranchSummary[];
  selectedBranchId: string | null;
  dailyDays: number;
  monthlyMonths: number;
};

export type DashboardMapPoint = {
  _id: string;
  name?: string;
  nameAr?: string;
  lat: number;
  lng: number;
  radiusMeters?: number;
  type?: string;
  zoneId?: string;
  addressText?: string;
  isActive?: boolean;
};

export type DashboardAtharMarker = {
  id: string;
  lat: number;
  lng: number;
  name?: string;
  icon?: string;
};

export type DashboardAtharZone = {
  id: string;
  name: string;
  color?: string;
  center: { lat: number; lng: number } | null;
  vertices: Array<{ lat: number; lng: number }>;
};

export type DashboardAtharObject = {
  id: string;
  imei: string;
  name: string;
  plateNumber: string | null;
  lat: number | null;
  lng: number | null;
  speed: number;
  angle: number;
  active: boolean;
  dtTracker: string | null;
  dtServer: string | null;
  model: string | null;
  device: string | null;
  raw: Record<string, any>;
};

export type DashboardVehicleSummary = {
  _id: string;
  name: string;
  plateNumber?: string | null;
  imei?: string;
  atharObjectId?: string | null;
  routeId?: string | null;
  isActive?: boolean;
};

export type DashboardMapData = {
  points: DashboardMapPoint[];
  markers: DashboardAtharMarker[];
  zones: DashboardAtharZone[];
  objects: DashboardAtharObject[];
  vehicles: DashboardVehicleSummary[];
};
