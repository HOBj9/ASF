/**
 * Route Service
 * Business logic for route management
 */

import connectDB from '@/lib/mongodb';
import Route, { IRoute } from '@/models/Route';
import RoutePoint, { IRoutePoint } from '@/models/RoutePoint';
import Point from '@/models/Point';
import Municipality from '@/models/Municipality';

export interface CreateRouteData {
  municipalityId: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateRouteData {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface RoutePointInput {
  pointId: string;
  order: number;
}

export class RouteService {
  async create(data: CreateRouteData): Promise<IRoute> {
    await connectDB();

    const municipality = await Municipality.findById(data.municipalityId).lean();
    if (!municipality) {
      throw new Error('البلدية غير موجودة');
    }

    const route = await Route.create({
      municipalityId: data.municipalityId,
      name: data.name.trim(),
      description: data.description || null,
      isActive: data.isActive ?? true,
    });

    return route;
  }

  async getAll(municipalityId: string): Promise<IRoute[]> {
    await connectDB();
    return Route.find({ municipalityId }).lean().exec();
  }

  async getById(id: string, municipalityId: string): Promise<IRoute | null> {
    await connectDB();
    return Route.findOne({ _id: id, municipalityId }).lean().exec();
  }

  async update(id: string, municipalityId: string, data: UpdateRouteData): Promise<IRoute | null> {
    await connectDB();
    const route = await Route.findOne({ _id: id, municipalityId });
    if (!route) {
      throw new Error('المسار غير موجود');
    }

    const updateData: any = { ...data };
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined && data.description === '') updateData.description = null;

    const updated = await Route.findByIdAndUpdate(route._id, updateData, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();

    return updated;
  }

  async delete(id: string, municipalityId: string): Promise<boolean> {
    await connectDB();
    await RoutePoint.deleteMany({ routeId: id }).exec();
    const deleted = await Route.findOneAndDelete({ _id: id, municipalityId }).exec();
    return !!deleted;
  }

  async getRoutePoints(routeId: string, municipalityId: string): Promise<IRoutePoint[]> {
    await connectDB();
    const route = await Route.findOne({ _id: routeId, municipalityId }).lean();
    if (!route) {
      throw new Error('المسار غير موجود');
    }

    return RoutePoint.find({ routeId }).sort({ order: 1 }).lean().exec();
  }

  async setRoutePoints(
    routeId: string,
    municipalityId: string,
    points: RoutePointInput[]
  ): Promise<IRoutePoint[]> {
    await connectDB();
    const route = await Route.findOne({ _id: routeId, municipalityId }).lean();
    if (!route) {
      throw new Error('المسار غير موجود');
    }

    const pointIds = points.map((p) => p.pointId);
    const count = await Point.countDocuments({
      _id: { $in: pointIds },
      municipalityId,
    });
    if (count !== pointIds.length) {
      throw new Error('يوجد حاويات غير تابعة للبلدية');
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
