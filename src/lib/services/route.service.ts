/**
 * Route Service
 * Business logic for route management
 */

import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Route, { IRoute } from '@/models/Route';
import RoutePoint, { IRoutePoint } from '@/models/RoutePoint';
import Point from '@/models/Point';
import Branch from '@/models/Branch';
import { WorkScheduleService } from '@/lib/services/work-schedule.service';

export interface CreateRouteData {
  branchId: string;
  name: string;
  description?: string;
  color?: string;
  isActive?: boolean;
  zoneIds?: string[];
  workScheduleId?: string | null;
}

export interface UpdateRouteData {
  name?: string;
  description?: string;
  color?: string;
  isActive?: boolean;
  zoneIds?: string[];
  workScheduleId?: string | null;
}

export interface RoutePointInput {
  pointId: string;
  order: number;
}

const workScheduleService = new WorkScheduleService();

export class RouteService {
  async create(data: CreateRouteData): Promise<IRoute> {
    await connectDB();

    const branch = await Branch.findById(data.branchId).lean();
    if (!branch) {
      throw new Error('الفرع غير موجود');
    }

    if (data.workScheduleId) {
      const available = await workScheduleService.isAvailableForBranch(
        data.workScheduleId,
        data.branchId
      );
      if (!available) {
        throw new Error('جدول العمل المحدد غير متاح لهذا الفرع');
      }
    }

    const zoneIds = Array.isArray(data.zoneIds)
      ? data.zoneIds
          .filter((id) => id && String(id).trim())
          .map((id) => new mongoose.Types.ObjectId(String(id)))
      : [];
    const workScheduleId = data.workScheduleId && String(data.workScheduleId).trim()
      ? new mongoose.Types.ObjectId(String(data.workScheduleId))
      : null;

    const route = await Route.create({
      branchId: data.branchId,
      name: data.name.trim(),
      description: data.description || null,
      color: data.color?.trim() || '#16a34a',
      isActive: data.isActive ?? true,
      zoneIds,
      workScheduleId,
    });

    return route;
  }

  async getAll(branchId: string): Promise<IRoute[]> {
    await connectDB();
    return Route.find({ branchId })
      .populate({ path: 'zoneIds', model: 'RouteZone', select: 'name nameAr', strictPopulate: false })
      .populate({ path: 'workScheduleId', model: 'WorkSchedule', select: 'name nameAr', strictPopulate: false })
      .lean()
      .exec();
  }

  async getById(id: string, branchId: string): Promise<IRoute | null> {
    await connectDB();
    return Route.findOne({ _id: id, branchId })
      .populate({ path: 'zoneIds', model: 'RouteZone', select: 'name nameAr', strictPopulate: false })
      .populate({ path: 'workScheduleId', model: 'WorkSchedule', select: 'name nameAr', strictPopulate: false })
      .lean()
      .exec();
  }

  async update(id: string, branchId: string, data: UpdateRouteData): Promise<IRoute | null> {
    await connectDB();
    const route = await Route.findOne({ _id: id, branchId });
    if (!route) {
      throw new Error('المسار غير موجود');
    }

    if (data.workScheduleId) {
      const available = await workScheduleService.isAvailableForBranch(
        data.workScheduleId,
        branchId
      );
      if (!available) {
        throw new Error('جدول العمل المحدد غير متاح لهذا الفرع');
      }
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = String(data.name).trim();
    if (data.description !== undefined) updateData.description = data.description === '' ? null : data.description;
    if (data.color !== undefined) updateData.color = data.color?.trim() || '#16a34a';
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.zoneIds !== undefined) {
      updateData.zoneIds = Array.isArray(data.zoneIds)
        ? data.zoneIds
            .filter((id) => id && String(id).trim())
            .map((id) => new mongoose.Types.ObjectId(String(id)))
        : [];
    }
    if (data.workScheduleId !== undefined) {
      const wsVal = data.workScheduleId && String(data.workScheduleId).trim();
      updateData.workScheduleId = wsVal ? new mongoose.Types.ObjectId(wsVal) : null;
    }

    const updated = await Route.findByIdAndUpdate(route._id, { $set: updateData }, {
      new: true,
      runValidators: true,
    })
      .populate({ path: 'zoneIds', model: 'RouteZone', select: 'name nameAr', strictPopulate: false })
      .populate({ path: 'workScheduleId', model: 'WorkSchedule', select: 'name nameAr', strictPopulate: false })
      .lean()
      .exec();

    return updated;
  }

  async delete(id: string, branchId: string): Promise<boolean> {
    await connectDB();
    await RoutePoint.deleteMany({ routeId: id }).exec();
    const deleted = await Route.findOneAndDelete({ _id: id, branchId }).exec();
    return !!deleted;
  }

  async getRoutePoints(routeId: string, branchId: string): Promise<IRoutePoint[]> {
    await connectDB();
    const route = await Route.findOne({ _id: routeId, branchId }).lean();
    if (!route) {
      throw new Error('المسار غير موجود');
    }

    return RoutePoint.find({ routeId }).sort({ order: 1 }).lean().exec();
  }

  /**
   * Get all routes with path and points for map display
   */
  async getRoutesWithPointsForMap(branchId: string): Promise<
    Array<{
      _id: string;
      name: string;
      color: string;
      path: { type: string; coordinates: number[][] } | null;
      points: Array<{ _id: string; name?: string; nameAr?: string; lat: number; lng: number; order: number }>;
    }>
  > {
    await connectDB();
    const routes = await Route.find({ branchId }).lean().exec();
    const result: Array<{
      _id: string;
      name: string;
      color: string;
      path: { type: string; coordinates: number[][] } | null;
      points: Array<{ _id: string; name?: string; nameAr?: string; lat: number; lng: number; order: number }>;
    }> = [];

    for (const route of routes) {
      const routePoints = await RoutePoint.find({ routeId: route._id }).sort({ order: 1 }).lean().exec();
      const pointIds = routePoints.map((rp: any) => rp.pointId);
      const pointDocs = await Point.find({ _id: { $in: pointIds } })
        .select('name nameAr lat lng')
        .lean();
      const pointMap = new Map(pointDocs.map((p: any) => [String(p._id), p]));

      const points = routePoints.map((rp: any) => {
        const p = pointMap.get(String(rp.pointId));
        if (!p) return null;
        return {
          _id: String(p._id),
          name: (p as any).name,
          nameAr: (p as any).nameAr,
          lat: Number((p as any).lat),
          lng: Number((p as any).lng),
          order: rp.order,
        };
      }).filter(Boolean) as any[];

      result.push({
        _id: String(route._id),
        name: route.name,
        color: (route as any).color || '#16a34a',
        path: (route as any).path?.coordinates ? { type: 'LineString', coordinates: (route as any).path.coordinates } : null,
        points,
      });
    }

    return result;
  }

  async setRoutePoints(
    routeId: string,
    branchId: string,
    points: RoutePointInput[]
  ): Promise<IRoutePoint[]> {
    await connectDB();
    const route = await Route.findOne({ _id: routeId, branchId }).lean();
    if (!route) {
      throw new Error('المسار غير موجود');
    }

    const pointIds = points.map((p) => p.pointId);
    const count = await Point.countDocuments({
      _id: { $in: pointIds },
      branchId,
    });
    if (count !== pointIds.length) {
      throw new Error('يوجد حاويات غير تابعة للفرع');
    }

    await RoutePoint.deleteMany({ routeId }).exec();

    const created = await RoutePoint.insertMany(
      points.map((p) => ({
        routeId,
        pointId: p.pointId,
        order: p.order,
      }))
    );

    // Build routed path using OSRM
    const orderedPoints = points
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((p) => p.pointId);
    const pointDocs = await Point.find({ _id: { $in: orderedPoints } })
      .select('lat lng')
      .lean();
    const pointMap = new Map(pointDocs.map((p: any) => [p._id.toString(), p]));
    const coords = orderedPoints
      .map((id) => pointMap.get(String(id)))
      .filter(Boolean)
      .map((p: any) => [p.lng, p.lat]); // OSRM expects lng,lat

    if (coords.length >= 2) {
      const baseUrl = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
      const coordString = coords.map((c) => `${c[0]},${c[1]}`).join(';');
      const url = `${baseUrl}/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          const geometry = data?.routes?.[0]?.geometry;
          if (geometry && geometry.type === 'LineString' && Array.isArray(geometry.coordinates)) {
            await Route.findByIdAndUpdate(routeId, { path: geometry }).exec();
          }
        }
      } catch {
        // Silently ignore routing errors; route points still saved
      }
    }

    return created.map((doc) => doc.toObject());
  }
}

