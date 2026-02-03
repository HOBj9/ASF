import connectDB from '@/lib/mongodb';
import Vehicle from '@/models/Vehicle';
import Driver from '@/models/Driver';
import Branch from '@/models/Branch';
import { AtharService } from '@/lib/services/athar.service';

export type VehicleLiveLocationItem = {
  id: string;
  busNumber: string;
  driverName: string;
  route: string;
  status: 'moving' | 'stopped' | 'offline';
  lastUpdate: string;
  passengers: number;
  capacity: number;
  speed: number;
  coordinates: [number, number] | null;
  imei?: string;
  engineStatus?: boolean;
};

function createVehicleLabel(vehicleId: string): string {
  return `مركبة ${vehicleId.slice(-4)}`;
}

export class LiveTrackingService {
  private async resolveAtharService(branchId: string): Promise<AtharService> {
    await connectDB();
    const branch = await Branch.findById(branchId).select('atharKey').lean();
    const apiKey =
      branch?.atharKey || process.env.ATHAR_API_KEY || process.env.ATHAR_API_KEY1 || '';

    if (!apiKey) {
      throw new Error('مفتاح أثر غير مهيأ لهذا الفرع');
    }

    return new AtharService({
      baseUrl: process.env.ATHAR_BASE_URL || 'https://admin.alather.net/api/api.php',
      apiKey,
      api: process.env.ATHAR_API || process.env.ATHAR_API_TYPE || 'user',
      version: process.env.ATHAR_VERSION || '1.0',
    });
  }

  async getBranchVehicleLocations(branchId: string): Promise<VehicleLiveLocationItem[]> {
    await connectDB();

    const vehicles = await Vehicle.find({
      branchId,
      imei: { $ne: null },
      isActive: true,
    })
      .select('name plateNumber imei driverId')
      .lean();

    if (!vehicles.length) return [];

    const driverIds = vehicles
      .map((v) => (v.driverId ? String(v.driverId) : null))
      .filter((v): v is string => !!v);

    const driverMap = new Map<string, string>();
    if (driverIds.length) {
      const drivers = await Driver.find({ _id: { $in: driverIds } }).select('name').lean();
      for (const driver of drivers) {
        driverMap.set(String(driver._id), driver.name || 'غير محدد');
      }
    }

    const imeis = vehicles
      .map((v) => String(v.imei || '').trim())
      .filter(Boolean);

    const athar = await this.resolveAtharService(branchId);
    const locationsByImei = await athar.getObjectLocations(imeis);

    return vehicles.map((vehicle) => {
      const imei = String(vehicle.imei || '').trim();
      const info = locationsByImei[imei];
      const hasCoordinates =
        info && info.lat !== null && info.lng !== null && Number.isFinite(info.lat) && Number.isFinite(info.lng);
      const driverName =
        (vehicle.driverId ? driverMap.get(String(vehicle.driverId)) : null) || 'غير محدد';

      if (hasCoordinates) {
        const status: VehicleLiveLocationItem['status'] = info.engineStatus ? 'moving' : 'stopped';
        return {
          id: String(vehicle._id),
          busNumber: vehicle.plateNumber || vehicle.name || createVehicleLabel(String(vehicle._id)),
          driverName,
          route: 'غير محدد',
          status,
          lastUpdate: 'منذ لحظات',
          passengers: 0,
          capacity: 40,
          speed: Number(info.speed || 0),
          coordinates: [Number(info.lat), Number(info.lng)],
          imei,
          engineStatus: !!info.engineStatus,
        };
      }

      return {
        id: String(vehicle._id),
        busNumber: vehicle.plateNumber || vehicle.name || createVehicleLabel(String(vehicle._id)),
        driverName,
        route: 'غير محدد',
        status: 'offline',
        lastUpdate: 'غير متصل',
        passengers: 0,
        capacity: 40,
        speed: 0,
        coordinates: null,
        imei,
        engineStatus: false,
      };
    });
  }
}
