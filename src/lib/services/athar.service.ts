/**
 * Athar Service
 * Communication layer with Athar GPS platform
 */

import Branch from '@/models/Branch';
import connectDB from '@/lib/mongodb';

export interface AtharConfig {
  baseUrl: string;
  apiKey: string;
  api: string;
  version: string;
}

export class AtharService {
  private config: AtharConfig;

  constructor(config: AtharConfig) {
    this.config = config;
  }

  static async forBranch(branchId: string): Promise<AtharService> {
    console.log('[Athar] forBranch: branchId=', branchId);
    await connectDB();
    const branch = await Branch.findById(branchId).select('atharKey').lean();
    if (!branch?.atharKey) {
      console.log('[Athar] forBranch: no atharKey for branch', branchId);
      throw new Error('مفتاح Athar API غير معرّف للفرع');
    }
    console.log('[Athar] forBranch: OK, instance created for branch', branchId);

    return new AtharService({
      baseUrl: process.env.ATHAR_BASE_URL || 'https://admin.alather.net/api/api.php',
      apiKey: branch.atharKey,
      api: process.env.ATHAR_API_TYPE || 'user',
      version: process.env.ATHAR_VERSION || '1.0',
    });
  }

  private async makeRequest(params: Record<string, any>): Promise<any> {
    const url = new URL(this.config.baseUrl);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    url.searchParams.append('api', this.config.api);
    url.searchParams.append('ver', this.config.version);
    url.searchParams.append('key', this.config.apiKey);

    const urlStr = url.toString();
    const safeUrl = urlStr.replace(/key=[^&]+/, 'key=***');
    console.log('[Athar] makeRequest: cmd=', params.cmd, 'url=', safeUrl);

    const response = await fetch(urlStr, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Athar-IoT/1.0',
      },
    });

    if (!response.ok) {
      console.log('[Athar] makeRequest: error', response.status, response.statusText);
      throw new Error(`Athar API error: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    if (!text || !text.trim()) {
      console.log('[Athar] makeRequest: empty response body');
      return {};
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.log('[Athar] makeRequest: invalid JSON, raw (first 500 chars)=', text.slice(0, 500));
      throw new Error(
        `Athar API returned invalid JSON: ${parseError instanceof Error ? parseError.message : 'Unknown'}`
      );
    }

    console.log('[Athar] makeRequest: response keys=', Object.keys(data || {}));
    return data;
  }

  private getZoneVertices(
    centralLatitude: number,
    centralLongitude: number,
    radiusMeters: number = 500
  ): string {
    const earthRadiusMeters = 6378137.0;
    const distanceInRadians = radiusMeters / earthRadiusMeters;
    const coordinates: number[] = [];

    for (let i = 0; i <= 360; i += 9) {
      const radial = (i * Math.PI) / 180;
      const centralLatRad = (centralLatitude * Math.PI) / 180;
      const centralLngRad = (centralLongitude * Math.PI) / 180;

      const latitudeInRadians = Math.asin(
        Math.sin(centralLatRad) * Math.cos(distanceInRadians) +
          Math.cos(centralLatRad) * Math.sin(distanceInRadians) * Math.cos(radial)
      );

      const deltaLongitudeInRadians = Math.atan2(
        Math.sin(radial) * Math.sin(distanceInRadians) * Math.cos(centralLatRad),
        Math.cos(distanceInRadians) - Math.sin(centralLatRad) * Math.sin(latitudeInRadians)
      );

      const longitudeInRadians =
        ((centralLngRad + deltaLongitudeInRadians + Math.PI) % (2 * Math.PI)) - Math.PI;

      const latDeg = (latitudeInRadians * 180) / Math.PI;
      const lngDeg = (longitudeInRadians * 180) / Math.PI;

      coordinates.push(Number(latDeg.toFixed(6)));
      coordinates.push(Number(lngDeg.toFixed(6)));
    }

    return coordinates.join(',');
  }

  async getZones(): Promise<any[]> {
    console.log('[Athar] getZones: calling USER_GET_ZONES');
    const response = await this.makeRequest({ cmd: 'USER_GET_ZONES' });
    if (!response) {
      console.log('[Athar] getZones: empty response');
      return [];
    }
    const zonesSource =
      response.zones ??
      response.data?.zones ??
      response.data ??
      response;

    let zones: any[] = [];
    if (Array.isArray(zonesSource)) {
      zones = zonesSource;
    } else if (zonesSource && typeof zonesSource === 'object') {
      // Some Athar accounts return zones as keyed object:
      // { "69167": { name, vertices, ... }, ... }
      zones = Object.entries(zonesSource).map(([key, value]) => {
        const zone = (value && typeof value === 'object' ? value : {}) as Record<string, any>;
        return {
          ...zone,
          zone_id: zone.zone_id ?? zone.id ?? key,
          id: zone.id ?? zone.zone_id ?? key,
          zone_vertices: zone.zone_vertices ?? zone.zoneVertices ?? zone.vertices,
        };
      });
    }
    console.log('[Athar] getZones: count=', zones.length, 'sample keys=', zones[0] ? Object.keys(zones[0]) : []);
    return zones;
  }

  /** Normalized marker shape for map display */
  static normalizeMarker(m: any): { id: string; lat: number; lng: number; name?: string } | null {
    const lat = Number(m.lat ?? m.latitude ?? m.y);
    const lng = Number(m.lng ?? m.longitude ?? m.x);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const id = String(m.id ?? m.marker_id ?? m._id ?? `${lat}-${lng}`);
    const name = m.name ?? m.nameAr ?? m.title ?? '';
    return { id, lat, lng, name };
  }

  async getMarkers(): Promise<Array<{ id: string; lat: number; lng: number; name?: string }>> {
    console.log('[Athar] getMarkers: calling USER_GET_MARKERS');
    const response = await this.makeRequest({ cmd: 'USER_GET_MARKERS' });
    if (!response) {
      console.log('[Athar] getMarkers: empty response');
      return [];
    }
    const raw = Array.isArray(response.markers)
      ? response.markers
      : Array.isArray(response.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];
    type NormMarker = { id: string; lat: number; lng: number; name?: string };
    const markers = raw
      .map((m: any) => AtharService.normalizeMarker(m))
      .filter((m: NormMarker | null): m is NormMarker => m != null);
    console.log('[Athar] getMarkers: count=', markers.length);
    return markers;
  }

  async findZoneIdByName(name: string): Promise<string | null> {
    console.log('[Athar] findZoneIdByName: name=', name);
    const zones = await this.getZones();
    const found = zones.find((z: any) => String(z.name).trim() === name.trim());
    if (!found) {
      console.log('[Athar] findZoneIdByName: not found');
      return null;
    }
    const zoneIdStr = String(found.zone_id || found.id || '');
    const match = zoneIdStr.match(/^(\d+)/);
    const result = match ? match[1] : zoneIdStr || null;
    console.log('[Athar] findZoneIdByName: found zoneId=', result);
    return result;
  }

  async createZone(
    pointName: string,
    centerPoint: { lat: number; lng: number },
    radiusMeters: number = 500
  ): Promise<string | null> {
    console.log('[Athar] createZone: name=', pointName, 'center=', centerPoint, 'radius=', radiusMeters);
    const zoneVertices = this.getZoneVertices(centerPoint.lat, centerPoint.lng, radiusMeters);

    const response = await this.makeRequest({
      cmd: 'ADD_ZONE',
      name: pointName,
      zone_vertices: zoneVertices,
      zone_id: 'false',
      group_id: '0',
    });

    if (response && response.zone_id) {
      const zoneIdStr = String(response.zone_id);
      const match = zoneIdStr.match(/^(\d+)/);
      const zoneId = match ? match[1] : zoneIdStr;
      console.log('[Athar] createZone: created zoneId=', zoneId);
      return zoneId;
    }

    console.log('[Athar] createZone: failed, response=', response);
    throw new Error('فشل إنشاء المنطقة في Athar');
  }

  async ensureZone(
    pointName: string,
    centerPoint: { lat: number; lng: number },
    radiusMeters: number = 500
  ): Promise<string> {
    console.log('[Athar] ensureZone: name=', pointName);
    const existingId = await this.findZoneIdByName(pointName);
    if (existingId) {
      console.log('[Athar] ensureZone: using existing zoneId=', existingId);
      return existingId;
    }
    const zoneId = await this.createZone(pointName, centerPoint, radiusMeters);
    if (!zoneId) {
      throw new Error('Athar لم يُرجع zoneId');
    }
    return zoneId;
  }

  async createZoneEvent(
    pointName: string,
    zoneId: string,
    imei: string,
    zoneType: 'zone_in' | 'zone_out',
    webhookUrl: string
  ): Promise<string | null> {
    console.log('[Athar] createZoneEvent: pointName=', pointName, 'zoneId=', zoneId, 'imei=', imei, 'type=', zoneType);
    const eventName = `${pointName}_${zoneType}`;
    const secret = process.env.ATHAR_WEBHOOK_SECRET || '';
    const webhookWithZoneId =
      webhookUrl + (webhookUrl.includes('?') ? '&' : '?') + `zone_id=${zoneId}`;
    const webhookWithSecret = secret
      ? webhookWithZoneId + `&secret=${encodeURIComponent(secret)}`
      : webhookWithZoneId;

    const response = await this.makeRequest({
      cmd: 'ADD_NEW_EVENT',
      name: eventName,
      zones: zoneId,
      event_id: 'false',
      type: zoneType,
      webhook_url: webhookWithSecret,
      webhook_template_id: 0,
      imei: imei,
    });

    if (response && response.event_id) {
      console.log('[Athar] createZoneEvent: created event_id=', response.event_id);
      return String(response.event_id);
    }

    console.log('[Athar] createZoneEvent: failed, response=', response);
    throw new Error('فشل إنشاء حدث المنطقة في Athar');
  }
}
