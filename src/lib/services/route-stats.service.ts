/**
 * Route Stats Service
 * Statistics and visit records for routes
 */

import connectDB from '@/lib/mongodb';
import Route from '@/models/Route';
import RoutePoint from '@/models/RoutePoint';
import Point from '@/models/Point';
import PointVisit from '@/models/PointVisit';
import Vehicle from '@/models/Vehicle';
import Branch from '@/models/Branch';
import WorkSchedule from '@/models/WorkSchedule';
import {
  enumerateWorkDaysInRange,
  getWorkDayRangeForDate,
  WorkDayEntry,
  WorkScheduleDayDef,
} from '@/lib/utils/work-day.util';
import mongoose from 'mongoose';

const DAY_NAMES_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export interface WorkDayStats {
  date: string;
  dateStr: string;
  dayOfWeek: number;
  dayNameAr: string;
  startTime: string;
  endTime: string;
  visitedCount: number;
  totalCount: number;
  completionRate: number;
}

export interface CompletionStatsResult {
  workDays: WorkDayStats[];
  totalWorkDays: number;
  route: {
    _id: string;
    name: string;
    workScheduleId: string | null;
    pointsCount: number;
    path?: { type: 'LineString'; coordinates: number[][] } | null;
  };
}

export interface VisitedPointsResult {
  visitedPointIds: Set<string>;
  visits: Array<{
    _id: string;
    pointId: string;
    vehicleId: string;
    entryTime: Date;
    exitTime?: Date;
    durationSeconds?: number;
  }>;
}

export interface VisitOrderAnalysis {
  inOrder: boolean;
  actualOrder: string[];
  expectedOrder: string[];
  outOfOrderPoints: string[];
}

export class RouteStatsService {
  /**
   * Get route points ordered by order
   */
  async getRoutePoints(routeId: string): Promise<Array<{ pointId: string; order: number }>> {
    await connectDB();
    const points = await RoutePoint.find({ routeId }).sort({ order: 1 }).lean().exec();
    return points.map((p: any) => ({ pointId: String(p.pointId), order: p.order }));
  }

  /**
   * Get completion stats for a route in a date range
   */
  async getCompletionStats(
    routeId: string,
    branchId: string,
    fromDate: Date,
    toDate: Date,
    options?: { vehicleId?: string; page?: number; pageSize?: number }
  ): Promise<CompletionStatsResult> {
    await connectDB();

    const route = await Route.findOne({ _id: routeId, branchId }).lean().exec();
    if (!route) throw new Error('المسار غير موجود');

    const branch = await Branch.findById(branchId).select('timezone').lean().exec();
    const timezone = (branch as any)?.timezone || 'Asia/Damascus';

    const routePoints = await RoutePoint.find({ routeId }).sort({ order: 1 }).lean().exec();
    const totalCount = routePoints.length;
    const pointIds = new Set(routePoints.map((rp: any) => String(rp.pointId)));

    if (totalCount === 0) {
      const routeWithPoints = await this.getRouteWithPoints(routeId, branchId);
      return {
        workDays: [],
        totalWorkDays: 0,
        route: {
          _id: String(route._id),
          name: (route as any).name,
          color: (route as any).color || '#16a34a',
          workScheduleId: (route as any).workScheduleId ? String((route as any).workScheduleId) : null,
          pointsCount: 0,
          path: (route as any).path ?? null,
          points: routeWithPoints?.points ?? [],
        },
      };
    }

    const workScheduleId = (route as any).workScheduleId;
    if (!workScheduleId) {
      const routeWithPoints = await this.getRouteWithPoints(routeId, branchId);
      return {
        workDays: [],
        totalWorkDays: 0,
        route: {
          _id: String(route._id),
          name: (route as any).name,
          color: (route as any).color || '#16a34a',
          workScheduleId: null,
          pointsCount: totalCount,
          path: (route as any).path ?? null,
          points: routeWithPoints?.points ?? [],
        },
      };
    }

    const workSchedule = await WorkSchedule.findById(workScheduleId).lean().exec();
    if (!workSchedule || !(workSchedule as any).days?.length) {
      const routeWithPoints = await this.getRouteWithPoints(routeId, branchId);
      return {
        workDays: [],
        totalWorkDays: 0,
        route: {
          _id: String(route._id),
          name: (route as any).name,
          color: (route as any).color || '#16a34a',
          workScheduleId: String(workScheduleId),
          pointsCount: totalCount,
          path: (route as any).path ?? null,
          points: routeWithPoints?.points ?? [],
        },
      };
    }

    const workDays = enumerateWorkDaysInRange(
      fromDate,
      toDate,
      workSchedule as { days: WorkScheduleDayDef[] },
      timezone
    );

    const vehicleIds = await Vehicle.find({ routeId, branchId })
      .select('_id')
      .lean()
      .exec();
    const vehicleIdSet = new Set(vehicleIds.map((v: any) => String(v._id)));

    if (options?.vehicleId) {
      if (!vehicleIdSet.has(options.vehicleId)) {
        vehicleIdSet.clear();
      } else {
        vehicleIdSet.clear();
        vehicleIdSet.add(options.vehicleId);
      }
    }

    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 50;
    const startIdx = (page - 1) * pageSize;
    const paginatedWorkDays = workDays.slice(startIdx, startIdx + pageSize);

    const workDayStats: WorkDayStats[] = [];

    for (const wd of paginatedWorkDays) {
      const { visitedPointIds } = await this.getVisitedPointsForDay(
        routeId,
        branchId,
        { start: wd.start, end: wd.end },
        vehicleIdSet.size > 0 ? Array.from(vehicleIdSet) : undefined
      );
      const visitedCount = Array.from(visitedPointIds).filter((id) => pointIds.has(id)).length;
      workDayStats.push({
        date: wd.date.toISOString(),
        dateStr: wd.dateStr,
        dayOfWeek: wd.dayOfWeek,
        dayNameAr: DAY_NAMES_AR[wd.dayOfWeek] ?? '',
        startTime: wd.startTime,
        endTime: wd.endTime,
        visitedCount,
        totalCount,
        completionRate: totalCount > 0 ? Math.round((visitedCount / totalCount) * 100) : 0,
      });
    }

    const routeWithPoints = await this.getRouteWithPoints(routeId, branchId);
    return {
      workDays: workDayStats,
      totalWorkDays: workDays.length,
      route: {
        _id: String(route._id),
        name: (route as any).name,
        color: (route as any).color || '#16a34a',
        workScheduleId: String(workScheduleId),
        pointsCount: totalCount,
        path: (route as any).path ?? null,
        points: routeWithPoints?.points ?? [],
      },
    };
  }

  /**
   * Get visited points for a work day range
   */
  async getVisitedPointsForDay(
    routeId: string,
    branchId: string,
    workDayRange: { start: Date; end: Date },
    vehicleIds?: string[]
  ): Promise<VisitedPointsResult> {
    await connectDB();

    let vehicleIdSet: Set<string>;
    if (vehicleIds && vehicleIds.length > 0) {
      vehicleIdSet = new Set(vehicleIds);
    } else {
      const vehicles = await Vehicle.find({ routeId, branchId }).select('_id').lean().exec();
      vehicleIdSet = new Set(vehicles.map((v: any) => String(v._id)));
    }

    const filter: any = {
      branchId: new mongoose.Types.ObjectId(branchId),
      vehicleId: { $in: Array.from(vehicleIdSet).map((id) => new mongoose.Types.ObjectId(id)) },
      entryTime: { $gte: workDayRange.start, $lte: workDayRange.end },
    };

    const visits = await PointVisit.find(filter)
      .sort({ entryTime: 1 })
      .lean()
      .exec();

    const visitedPointIds = new Set<string>();
    const visitList = visits.map((v: any) => {
      visitedPointIds.add(String(v.pointId));
      return {
        _id: String(v._id),
        pointId: String(v.pointId),
        vehicleId: String(v.vehicleId),
        entryTime: v.entryTime,
        exitTime: v.exitTime,
        durationSeconds: v.durationSeconds,
      };
    });

    return { visitedPointIds, visits: visitList };
  }

  /**
   * Analyze visit order vs expected route order (when route is 100% complete)
   */
  async getVisitOrderAnalysis(
    routeId: string,
    branchId: string,
    workDayRange: { start: Date; end: Date },
    vehicleIds?: string[]
  ): Promise<VisitOrderAnalysis | null> {
    const routePoints = await this.getRoutePoints(routeId);
    const expectedOrder = routePoints.map((rp) => rp.pointId);

    const { visitedPointIds, visits } = await this.getVisitedPointsForDay(
      routeId,
      branchId,
      workDayRange,
      vehicleIds
    );

    if (visitedPointIds.size < expectedOrder.length) return null;

    const firstVisitByPoint = new Map<string, { entryTime: Date }>();
    for (const v of visits) {
      if (!firstVisitByPoint.has(v.pointId)) {
        firstVisitByPoint.set(v.pointId, { entryTime: v.entryTime });
      }
    }

    const actualOrder = [...firstVisitByPoint.entries()]
      .sort((a, b) => a[1].entryTime.getTime() - b[1].entryTime.getTime())
      .map(([pointId]) => pointId);

    const outOfOrderPoints: string[] = [];
    for (let i = 0; i < Math.min(actualOrder.length, expectedOrder.length); i++) {
      if (actualOrder[i] !== expectedOrder[i]) {
        outOfOrderPoints.push(actualOrder[i]);
      }
    }

    return {
      inOrder: outOfOrderPoints.length === 0,
      actualOrder,
      expectedOrder,
      outOfOrderPoints,
    };
  }

  /**
   * Get route with points for map/stats display
   */
  async getRouteWithPoints(routeId: string, branchId: string) {
    await connectDB();
    const route = await Route.findOne({ _id: routeId, branchId }).lean().exec();
    if (!route) return null;

    const routePoints = await RoutePoint.find({ routeId }).sort({ order: 1 }).lean().exec();
    const pointIds = routePoints.map((rp: any) => rp.pointId);
    const points = await Point.find({ _id: { $in: pointIds } })
      .select('name nameAr lat lng')
      .lean()
      .exec();

    const pointMap = new Map(points.map((p: any) => [String(p._id), p]));
    const orderedPoints = routePoints.map((rp: any) => {
      const p = pointMap.get(String(rp.pointId));
      if (!p) return null;
      return {
        _id: String((p as any)._id),
        pointId: String(rp.pointId),
        order: rp.order,
        name: (p as any).name,
        nameAr: (p as any).nameAr,
        lat: (p as any).lat,
        lng: (p as any).lng,
      };
    }).filter(Boolean);

    return {
      route: {
        _id: String(route._id),
        name: (route as any).name,
        color: (route as any).color || '#16a34a',
        workScheduleId: (route as any).workScheduleId ? String((route as any).workScheduleId) : null,
      },
      points: orderedPoints,
    };
  }
}
