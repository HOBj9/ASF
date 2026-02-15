/**
 * Point Service
 * Business logic for point management
 */

import connectDB from '@/lib/mongodb';
import Point, { IPoint, PointType } from '@/models/Point';
import Branch from '@/models/Branch';

export interface CreatePointData {
  branchId: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  type?: PointType;
  lat: number;
  lng: number;
  radiusMeters?: number;
  zoneId?: string;
  addressText?: string;
  isActive?: boolean;
}

export interface UpdatePointData {
  name?: string;
  nameAr?: string;
  nameEn?: string;
  type?: PointType;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  zoneId?: string;
  addressText?: string;
  isActive?: boolean;
}

export class PointService {
  async create(data: CreatePointData): Promise<IPoint> {
    await connectDB();

    const branch = await Branch.findById(data.branchId).lean();
    if (!branch) {
      throw new Error('الفرع غير موجود');
    }

    const existing = await Point.findOne({
      branchId: data.branchId,
      name: data.name.trim(),
    }).lean();
    if (existing) {
      throw new Error('الحاوية موجودة مسبقاً');
    }

    const point = await Point.create({
      branchId: data.branchId,
      name: data.name.trim(),
      nameAr: data.nameAr || null,
      nameEn: data.nameEn || null,
      type: data.type || 'container',
      lat: data.lat,
      lng: data.lng,
      radiusMeters: data.radiusMeters ?? 500,
      zoneId: data.zoneId || null,
      addressText: data.addressText || null,
      isActive: data.isActive ?? true,
    });

    return point;
  }

  async getAll(branchId: string): Promise<IPoint[]> {
    await connectDB();
    return Point.find({ branchId }).lean().exec();
  }

  async getById(id: string, branchId: string): Promise<IPoint | null> {
    await connectDB();
    return Point.findOne({ _id: id, branchId }).lean().exec();
  }

  async update(id: string, branchId: string, data: UpdatePointData): Promise<IPoint | null> {
    await connectDB();

    const point = await Point.findOne({ _id: id, branchId });
    if (!point) {
      throw new Error('الحاوية غير موجودة');
    }

    const updateData: any = { ...data };
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.nameAr !== undefined && data.nameAr === '') updateData.nameAr = null;
    if (data.nameEn !== undefined && data.nameEn === '') updateData.nameEn = null;
    if (data.zoneId !== undefined) updateData.zoneId = data.zoneId ?? null;
    if (data.addressText !== undefined && data.addressText === '') updateData.addressText = null;

    const updated = await Point.findByIdAndUpdate(point._id, updateData, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();

    return updated;
  }

  async delete(id: string, branchId: string): Promise<boolean> {
    await connectDB();
    const deleted = await Point.findOneAndDelete({ _id: id, branchId }).exec();
    return !!deleted;
  }

  /**
   * Import Athar markers as local points without calling Athar API.
   * Deduplicates by branchId + zoneId (marker.id). Skips markers that already have a local point.
   */
  async importFromAtharMarkers(
    branchId: string,
    markers: Array<{ id: string; lat: number; lng: number; name?: string }>
  ): Promise<{ imported: number; skipped: number }> {
    await connectDB();

    const branch = await Branch.findById(branchId).lean();
    if (!branch) {
      throw new Error('الفرع غير موجود');
    }

    let imported = 0;
    let skipped = 0;

    for (const m of markers) {
      const lat = Number(m.lat);
      const lng = Number(m.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const zoneId = String(m.id ?? '').trim();
      if (!zoneId) continue;

      const existing = await Point.findOne({ branchId, zoneId }).lean().exec();
      if (existing) {
        skipped++;
        continue;
      }

      const name = (m.name ?? '').trim() || `نقطة أثر ${zoneId}`;
      await Point.create({
        branchId,
        zoneId,
        name,
        nameAr: name,
        nameEn: name,
        type: 'container',
        lat,
        lng,
        radiusMeters: 500,
        isActive: true,
      });
      imported++;
    }

    return { imported, skipped };
  }

  /**
   * Compute center (lat, lng) from Athar zone_vertices string (lat1,lng1,lat2,lng2,...)
   */
  static zoneVerticesToCenter(zoneVertices: string | undefined): { lat: number; lng: number } | null {
    if (!zoneVertices || typeof zoneVertices !== 'string') return null;
    const parts = zoneVertices.split(',').map((s) => parseFloat(s.trim())).filter((n) => !Number.isNaN(n));
    if (parts.length < 2) return null;
    const lats: number[] = [];
    const lngs: number[] = [];
    for (let i = 0; i < parts.length; i += 2) {
      lats.push(parts[i]);
      if (i + 1 < parts.length) lngs.push(parts[i + 1]);
    }
    if (lats.length === 0 || lngs.length === 0) return null;
    const lat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const lng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
    return { lat, lng };
  }

  /**
   * Extract center (lat, lng) from a zone object using common Athar/API field names.
   */
  static zoneToCenter(z: Record<string, any>): { lat: number; lng: number } | null {
    const lat = z.lat ?? z.latitude ?? z.center_lat ?? z.centerLat ?? z.y;
    const lng = z.lng ?? z.longitude ?? z.center_lng ?? z.centerLng ?? z.x;
    if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    const latN = Number(lat);
    const lngN = Number(lng);
    if (Number.isFinite(latN) && Number.isFinite(lngN)) return { lat: latN, lng: lngN };
    return PointService.zoneVerticesToCenter(z.zone_vertices ?? z.zoneVertices ?? z.vertices);
  }

  /**
   * Sync points from Athar zones: create or update local points for each zone.
   */
  async syncFromAtharZones(
    branchId: string,
    zones: Array<Record<string, any>>
  ): Promise<IPoint[]> {
    console.log('[Athar] syncFromAtharZones: branchId=', branchId, 'zones count=', zones.length);
    await connectDB();

    const branch = await Branch.findById(branchId).lean();
    if (!branch) {
      throw new Error('الفرع غير موجود');
    }

    const results: IPoint[] = [];
    for (const z of zones) {
      const zoneIdRaw = z.zone_id ?? z.id ?? z._id;
      if (zoneIdRaw == null || zoneIdRaw === '') continue;
      const zoneId = String(zoneIdRaw).replace(/\?.*$/, '').match(/^(\d+)/)?.[1] ?? String(zoneIdRaw);
      const name = (z.name ?? z.nameAr ?? z.title ?? '').trim() || `منطقة ${zoneId}`;
      const center = PointService.zoneToCenter(z);

      const existing = await Point.findOne({ branchId, zoneId }).lean().exec();
      if (existing) {
        const updateData: any = { name, nameAr: name, nameEn: name };
        if (center) {
          updateData.lat = center.lat;
          updateData.lng = center.lng;
        }
        const updated = await Point.findByIdAndUpdate(existing._id, updateData, {
          new: true,
          runValidators: true,
        })
          .lean()
          .exec();
        if (updated) results.push(updated);
        continue;
      }

      if (!center) continue;

      const created = await Point.create({
        branchId,
        name,
        nameAr: name,
        nameEn: name,
        type: 'container',
        lat: center.lat,
        lng: center.lng,
        radiusMeters: 500,
        zoneId,
        isActive: true,
      });
      results.push(created);
    }

    console.log('[Athar] syncFromAtharZones: done, points count=', results.length);
    return results;
  }
}
