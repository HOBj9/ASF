/**
 * Point Service
 * Business logic for point management
 */

import connectDB from '@/lib/mongodb';
import Point, { IPoint, PointType } from '@/models/Point';
import Branch from '@/models/Branch';
import Organization from '@/models/Organization';

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
  primaryClassificationId?: string | null;
  secondaryClassificationId?: string | null;
  otherIdentifier?: string | null;
  isActive?: boolean;
  createdByUserId?: string | null;
}

export interface CreateOrgPointData {
  name: string;
  nameAr?: string;
  nameEn?: string;
  type?: PointType;
  lat: number;
  lng: number;
  radiusMeters?: number;
  addressText?: string;
  primaryClassificationId?: string | null;
  secondaryClassificationId?: string | null;
  otherIdentifier?: string | null;
  isActive?: boolean;
  createdByUserId?: string | null;
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
  primaryClassificationId?: string | null;
  secondaryClassificationId?: string | null;
  otherIdentifier?: string | null;
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
      primaryClassificationId: data.primaryClassificationId || null,
      secondaryClassificationId: data.secondaryClassificationId || null,
      otherIdentifier: data.otherIdentifier || null,
      isActive: data.isActive ?? true,
      createdByUserId: data.createdByUserId || null,
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
    if (data.primaryClassificationId !== undefined) updateData.primaryClassificationId = data.primaryClassificationId ?? null;
    if (data.secondaryClassificationId !== undefined) updateData.secondaryClassificationId = data.secondaryClassificationId ?? null;
    if (data.otherIdentifier !== undefined) updateData.otherIdentifier = data.otherIdentifier ?? null;

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

  /** Organization-level point: create at organization (branchId null). */
  async createAtOrganization(organizationId: string, data: CreateOrgPointData): Promise<IPoint> {
    await connectDB();

    const org = await Organization.findById(organizationId).lean();
    if (!org) {
      throw new Error('المؤسسة غير موجودة');
    }

    const existing = await Point.findOne({
      organizationId,
      branchId: null,
      name: data.name.trim(),
    }).lean();
    if (existing) {
      throw new Error('النقطة موجودة مسبقاً في المؤسسة');
    }

    const point = await Point.create({
      organizationId,
      branchId: null,
      name: data.name.trim(),
      nameAr: data.nameAr || null,
      nameEn: data.nameEn || null,
      type: data.type || 'container',
      lat: data.lat,
      lng: data.lng,
      radiusMeters: data.radiusMeters ?? 500,
      zoneId: null,
      addressText: data.addressText || null,
      primaryClassificationId: data.primaryClassificationId || null,
      secondaryClassificationId: data.secondaryClassificationId || null,
      otherIdentifier: data.otherIdentifier || null,
      isActive: data.isActive ?? true,
      createdByUserId: data.createdByUserId || null,
    });

    return point;
  }

  /** Get all organization-level points (branchId null). */
  async getByOrganization(organizationId: string): Promise<IPoint[]> {
    await connectDB();
    return Point.find({ organizationId, branchId: null }).lean().exec();
  }

  /** Get single org-level point by id. */
  async getOrgPointById(id: string, organizationId: string): Promise<IPoint | null> {
    await connectDB();
    return Point.findOne({ _id: id, organizationId, branchId: null }).lean().exec();
  }

  /**
   * Clone all organization-level points to a new branch (e.g. on branch creation).
   */
  async cloneOrganizationPointsToBranch(organizationId: string, branchId: string): Promise<number> {
    await connectDB();

    const branch = await Branch.findById(branchId).lean();
    if (!branch) {
      throw new Error('الفرع غير موجود');
    }

    const orgPoints = await Point.find({ organizationId, branchId: null }).lean().exec();
    if (orgPoints.length === 0) return 0;

    const toInsert = orgPoints.map((p) => ({
      organizationId: null,
      branchId,
      name: p.name,
      nameAr: p.nameAr || null,
      nameEn: p.nameEn || null,
      type: p.type,
      lat: p.lat,
      lng: p.lng,
      radiusMeters: p.radiusMeters ?? 500,
      zoneId: null,
      addressText: p.addressText || null,
      primaryClassificationId: (p as any).primaryClassificationId || null,
      secondaryClassificationId: (p as any).secondaryClassificationId || null,
      otherIdentifier: (p as any).otherIdentifier || null,
      isActive: p.isActive !== false,
      createdByUserId: (p as any).createdByUserId || null,
    }));

    await Point.insertMany(toInsert);
    return toInsert.length;
  }

  /**
   * Push one organization-level point to every existing branch of the organization.
   */
  async pushPointToAllBranches(organizationId: string, pointId: string): Promise<number> {
    await connectDB();

    const orgPoint = await Point.findOne({ _id: pointId, organizationId, branchId: null }).lean();
    if (!orgPoint) {
      throw new Error('النقطة غير موجودة على مستوى المؤسسة');
    }

    const branches = await Branch.find({ organizationId, isActive: true }).lean().exec();
    let created = 0;

    for (const branch of branches) {
      const bid = branch._id.toString();
      const exists = await Point.findOne({ branchId: bid, name: orgPoint.name }).lean();
      if (exists) continue;

      await Point.create({
        branchId: bid,
        name: orgPoint.name,
        nameAr: orgPoint.nameAr || null,
        nameEn: orgPoint.nameEn || null,
        type: orgPoint.type,
        lat: orgPoint.lat,
        lng: orgPoint.lng,
        radiusMeters: orgPoint.radiusMeters ?? 500,
        zoneId: null,
        addressText: orgPoint.addressText || null,
        primaryClassificationId: (orgPoint as any).primaryClassificationId || null,
        secondaryClassificationId: (orgPoint as any).secondaryClassificationId || null,
        otherIdentifier: (orgPoint as any).otherIdentifier || null,
        isActive: orgPoint.isActive !== false,
        createdByUserId: (orgPoint as any).createdByUserId || null,
      });
      created++;
    }

    return created;
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
