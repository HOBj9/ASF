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
    await connectDB();
    const branch = await Branch.findById(branchId).select('atharKey').lean();
    if (!branch?.atharKey) {
      throw new Error('Athar API key غير مُعرّف للفرع');
    }

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

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Athar-IoT/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Athar API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
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
    const response = await this.makeRequest({ cmd: 'GET_ZONES' });
    if (!response) return [];
    if (Array.isArray(response.zones)) return response.zones;
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response)) return response;
    return [];
  }

  async findZoneIdByName(name: string): Promise<string | null> {
    const zones = await this.getZones();
    const found = zones.find((z: any) => String(z.name).trim() === name.trim());
    if (!found) return null;
    const zoneIdStr = String(found.zone_id || found.id || '');
    const match = zoneIdStr.match(/^(\d+)/);
    return match ? match[1] : zoneIdStr || null;
  }

  async createZone(
    pointName: string,
    centerPoint: { lat: number; lng: number },
    radiusMeters: number = 500
  ): Promise<string | null> {
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
      return match ? match[1] : zoneIdStr;
    }

    throw new Error('فشل إنشاء المنطقة في Athar');
  }

  async ensureZone(
    pointName: string,
    centerPoint: { lat: number; lng: number },
    radiusMeters: number = 500
  ): Promise<string> {
    const existingId = await this.findZoneIdByName(pointName);
    if (existingId) return existingId;
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
      return String(response.event_id);
    }

    throw new Error('فشل إنشاء حدث المنطقة في Athar');
  }
}

