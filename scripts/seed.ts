import connectDB from "@/lib/mongodb";
import bcrypt from "bcryptjs";

import Permission from "@/models/Permission";
import Role from "@/models/Role";
import User from "@/models/User";
import Organization from "@/models/Organization";
import Branch from "@/models/Branch";
import Driver from "@/models/Driver";
import Vehicle from "@/models/Vehicle";
import Point from "@/models/Point";
import Route from "@/models/Route";
import RoutePoint from "@/models/RoutePoint";
import ZoneEvent from "@/models/ZoneEvent";
import PointVisit from "@/models/PointVisit";

import { defaultPermissions, defaultRoles } from "@/constants/permissions";
import { appConfig } from "@/lib/config/app.config";

type BranchSpec = {
  code: string;
  name: string;
  governorate: string;
  areaName: string;
  addressText: string;
  centerLat: number;
  centerLng: number;
  zoneSeed: number;
  atharKey?: string | null;
  neighborhoods: string[];
};

type PointSpec = {
  name: string;
  nameAr: string;
  type: "container" | "station" | "facility" | "other";
  lat: number;
  lng: number;
  radiusMeters: number;
  addressText: string;
  zoneId: string;
};

const timeZone = "Asia/Damascus";
const tartusAtharKey = "5E61F6F1F182AA8406F9DF535CBFBFDA";

const driverNames = [
  "أحمد الحسن",
  "محمد ديب",
  "محمود سليمان",
  "رامي الأحمد",
  "إبراهيم علي",
  "يوسف درويش",
  "سامر بشير",
  "علاء خزيم",
  "فراس الجندي",
  "قصي العلي",
  "جمال حسين",
  "منير زيدان",
  "زياد العبدالله",
  "أنس الحلاق",
  "عمر الخطيب",
  "شادي رمضان",
  "باسل حمزة",
  "مؤيد منصور",
  "نادر الحسين",
  "خالد حمود",
  "هشام درغام",
  "هيثم يوسف",
  "وسيم العلي",
  "طارق جمول",
];

const vehicleTypes = [
  { label: "شاحنة كبس خلفي", short: "GC" },
  { label: "شاحنة تحميل جانبي", short: "SL" },
  { label: "شاحنة صغيرة", short: "SP" },
  { label: "مركبة متابعة", short: "MO" },
];

const pointTypeLabels: Record<string, string> = {
  container: "حاوية القمامة",
  station: "محطة تجميع",
  facility: "مرفق خدمي",
  other: "نقطة تشغيل",
};

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatIndex(index: number) {
  return String(index + 1).padStart(2, "0");
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function offsetByMeters(
  lat: number,
  lng: number,
  metersNorth: number,
  metersEast: number
) {
  const latOffset = metersNorth / 111320;
  const lngOffset = metersEast / (111320 * Math.cos(toRadians(lat)));
  return {
    lat: Number((lat + latOffset).toFixed(6)),
    lng: Number((lng + lngOffset).toFixed(6)),
  };
}

function buildPointSpecs(spec: BranchSpec): PointSpec[] {
  const pointSpecs: PointSpec[] = [];
  let zoneIndex = 1;

  spec.neighborhoods.forEach((neighborhood, neighborhoodIndex) => {
    const ringDistance = 650 + neighborhoodIndex * 280;
    const angle = (neighborhoodIndex * 42 * Math.PI) / 180;
    const neighborhoodCenter = offsetByMeters(
      spec.centerLat,
      spec.centerLng,
      Math.sin(angle) * ringDistance,
      Math.cos(angle) * ringDistance
    );

    const localPoints: Array<{
      type: PointSpec["type"];
      count: number;
      stepNorth: number;
      stepEast: number;
    }> = [
      { type: "container", count: 6, stepNorth: 55, stepEast: 65 },
      { type: "station", count: 1, stepNorth: 90, stepEast: -120 },
      { type: "facility", count: 1, stepNorth: -130, stepEast: 80 },
      { type: "other", count: 1, stepNorth: -70, stepEast: -110 },
    ];

    localPoints.forEach(({ type, count, stepNorth, stepEast }) => {
      for (let i = 0; i < count; i++) {
        const label = pointTypeLabels[type];
        const pointPosition = offsetByMeters(
          neighborhoodCenter.lat,
          neighborhoodCenter.lng,
          stepNorth * (i + 1),
          stepEast * (i + 1)
        );
        const zoneId = String(spec.zoneSeed + zoneIndex).padStart(5, "0");

        pointSpecs.push({
          name: `${label} - ${neighborhood} - ${formatIndex(i)}`,
          nameAr: `${label} ${neighborhood} ${formatIndex(i)}`,
          type: type as PointSpec["type"],
          lat: pointPosition.lat,
          lng: pointPosition.lng,
          radiusMeters: randomBetween(70, 160),
          addressText: `${spec.name} - حي ${neighborhood}`,
          zoneId,
        });
        zoneIndex += 1;
      }
    });
  });

  return pointSpecs;
}

async function fetchAtharObjects(apiKey: string): Promise<any[]> {
  try {
    const baseUrl = process.env.ATHAR_BASE_URL || "https://admin.almobtakiroon.com/api/api.php";
    const api = process.env.ATHAR_API_TYPE || "user";
    const version = process.env.ATHAR_VERSION || "1.0";

    const url = new URL(baseUrl);
    url.searchParams.set("api", api);
    url.searchParams.set("ver", version);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("cmd", "USER_GET_OBJECTS");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Athar-Demo-Seed/1.0",
      },
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const source = payload?.objects ?? payload?.data ?? payload;
    if (Array.isArray(source)) return source;
    if (source && typeof source === "object") {
      return Object.values(source);
    }
    return [];
  } catch {
    return [];
  }
}

async function seed() {
  try {
    await connectDB();
    console.log("Connected to MongoDB");

    await Promise.all([
      Permission.deleteMany({}),
      Role.deleteMany({}),
      User.deleteMany({}),
      Organization.deleteMany({}),
      Branch.deleteMany({}),
      Driver.deleteMany({}),
      Vehicle.deleteMany({}),
      Point.deleteMany({}),
      Route.deleteMany({}),
      RoutePoint.deleteMany({}),
      ZoneEvent.deleteMany({}),
      PointVisit.deleteMany({}),
    ]);

    const permissions = await Permission.insertMany(
      defaultPermissions.map((perm) => ({
        name: perm.name,
        nameAr: perm.nameAr,
        resource: perm.resource,
        action: perm.action,
      }))
    );

    const permMap = new Map(permissions.map((p: any) => [p.name, p._id]));

    const superAdminRole = await Role.create({
      name: defaultRoles.superAdmin.name,
      nameAr: defaultRoles.superAdmin.nameAr,
      permissions: permissions.map((p: any) => p._id),
    });

    const organizationRole = await Role.create({
      name: defaultRoles.organizationAdmin.name,
      nameAr: defaultRoles.organizationAdmin.nameAr,
      permissions: defaultRoles.organizationAdmin.permissions
        .map((name) => permMap.get(name))
        .filter(Boolean),
    });

    const branchRole = await Role.create({
      name: defaultRoles.branchAdmin.name,
      nameAr: defaultRoles.branchAdmin.nameAr,
      permissions: defaultRoles.branchAdmin.permissions
        .map((name) => permMap.get(name))
        .filter(Boolean),
    });

    const branchUserRole = await Role.create({
      name: defaultRoles.branchUser.name,
      nameAr: defaultRoles.branchUser.nameAr,
      permissions: defaultRoles.branchUser.permissions
        .map((name) => permMap.get(name))
        .filter(Boolean),
    });

    const adminPassword = await bcrypt.hash(appConfig.defaultAdmin.password, 10);
    await User.create({
      name: appConfig.defaultAdmin.name,
      email: appConfig.defaultAdmin.email,
      password: adminPassword,
      role: superAdminRole._id,
      isActive: true,
    });

    const organization = await Organization.create({
      name: "مجلس مدينة طرطوس",
      slug: "tartus-city-council",
      type: "waste",
      labels: {
        branchLabel: "بلديات",
        pointLabel: "حاويات القمامة",
        vehicleLabel: "شاحنات قمامة",
        driverLabel: "سائقون",
        routeLabel: "خطوط النقل",
      },
      isActive: true,
    });

    const organizationPassword = await bcrypt.hash("org-tartus-123", 10);
    await User.create({
      name: "مدير مجلس مدينة طرطوس",
      email: "council@tartus.local",
      password: organizationPassword,
      role: organizationRole._id,
      organizationId: organization._id,
      isActive: true,
    });

    const branchSpecs: BranchSpec[] = [
      {
        code: "tartus-center",
        name: "بلدية طرطوس المركز",
        governorate: "طرطوس",
        areaName: "منطقة طرطوس",
        addressText: "ساحة الثورة - مركز مدينة طرطوس",
        centerLat: 34.8936225,
        centerLng: 35.885167,
        zoneSeed: 51000,
        atharKey: tartusAtharKey,
        neighborhoods: ["الكورنيش", "القديمة", "الرمل الجنوبي", "مشبكة", "الثورة", "المنشية"],
      },
      {
        code: "baniyas",
        name: "بلدية بانياس",
        governorate: "طرطوس",
        areaName: "منطقة بانياس",
        addressText: "مركز بلدية بانياس - الساحة الرئيسية",
        centerLat: 35.185136,
        centerLng: 35.9477821,
        zoneSeed: 52000,
        neighborhoods: ["القصور", "المرقب", "رأس النبع", "العنازة", "القوز", "الباصية"],
      },
      {
        code: "safita",
        name: "بلدية صافيتا",
        governorate: "طرطوس",
        areaName: "منطقة صافيتا",
        addressText: "مركز مدينة صافيتا - قرب الساحة العامة",
        centerLat: 34.820683,
        centerLng: 36.1177283,
        zoneSeed: 53000,
        neighborhoods: ["المركز", "القلعة", "بلاطة غربية", "وادي العيون", "بيت فارس", "عين دابش"],
      },
      {
        code: "dreikish",
        name: "بلدية الدريكيش",
        governorate: "طرطوس",
        areaName: "منطقة الدريكيش",
        addressText: "مجلس مدينة الدريكيش - المركز الإداري",
        centerLat: 34.8972475,
        centerLng: 36.1350818,
        zoneSeed: 54000,
        neighborhoods: ["الميدان", "البرانية", "الحي الشرقي", "الحي الغربي", "البلدة القديمة", "المنطقة الصناعية"],
      },
      {
        code: "sheikh-badr",
        name: "بلدية الشيخ بدر",
        governorate: "طرطوس",
        areaName: "منطقة الشيخ بدر",
        addressText: "مركز مدينة الشيخ بدر - قرب البلدية",
        centerLat: 34.9920957,
        centerLng: 36.0795901,
        zoneSeed: 55000,
        neighborhoods: ["المركز", "الدريجات", "الكريمية", "بمبلة", "بتعنيتا", "الزاهرة"],
      },
      {
        code: "qadmous",
        name: "بلدية القدموس",
        governorate: "طرطوس",
        areaName: "منطقة بانياس",
        addressText: "مركز مدينة القدموس - ساحة القلعة",
        centerLat: 35.1003277,
        centerLng: 36.1610851,
        zoneSeed: 56000,
        neighborhoods: ["القلعة", "المزة", "الحي الشمالي", "الحي الجنوبي", "بسورم", "الزوبة"],
      },
    ];

    const atharObjects = await fetchAtharObjects(tartusAtharKey);
    console.log(`Athar objects fetched for Tartus key: ${atharObjects.length}`);

    for (let branchIndex = 0; branchIndex < branchSpecs.length; branchIndex++) {
      const spec = branchSpecs[branchIndex];
      const branch = await Branch.create({
        organizationId: organization._id,
        name: spec.name,
        nameAr: spec.name,
        governorate: spec.governorate,
        areaName: spec.areaName,
        branchTypeLabel: organization.labels.branchLabel,
        addressText: spec.addressText,
        centerLat: spec.centerLat,
        centerLng: spec.centerLng,
        timezone: timeZone,
        atharKey: spec.atharKey || null,
        isActive: true,
      });

      const branchSlug = `${spec.code}-${spec.zoneSeed}`;
      const branchPassword = await bcrypt.hash("branch-admin-123", 10);
      await User.create({
        name: `مدير ${spec.name}`,
        email: `${branchSlug}@municipality.local`,
        password: branchPassword,
        role: branchRole._id,
        organizationId: organization._id,
        branchId: branch._id,
        isActive: true,
      });

      const branchUserPassword = await bcrypt.hash("branch-user-123", 10);
      await User.create({
        name: `مستخدم ${spec.name}`,
        email: `${branchSlug}@operator.local`,
        password: branchUserPassword,
        role: branchUserRole._id,
        organizationId: organization._id,
        branchId: branch._id,
        isActive: true,
      });

      const driverCount = 18;
      const drivers = await Driver.insertMany(
        Array.from({ length: driverCount }).map((_, idx) => ({
          branchId: branch._id,
          name: `${driverNames[(idx + branchIndex) % driverNames.length]} - ${spec.name}`,
          phone: `09${String(spec.zoneSeed + idx + 101).slice(0, 8)}`,
          isActive: idx % 9 !== 0,
        }))
      );

      const routes = await Route.insertMany([
        {
          branchId: branch._id,
          name: `خط جمع المسائي - ${spec.name}`,
          description: "خط ليلي مخصص لأحياء المركز التجاري والسكني",
          isActive: true,
        },
        {
          branchId: branch._id,
          name: `خط الأحياء الداخلية - ${spec.name}`,
          description: "جولة يومية على الأحياء الداخلية",
          isActive: true,
        },
        {
          branchId: branch._id,
          name: `خط السوق الرئيسي - ${spec.name}`,
          description: "خدمة الحاويات المحيطة بالأسواق والمحال",
          isActive: true,
        },
        {
          branchId: branch._id,
          name: `خط المناطق البعيدة - ${spec.name}`,
          description: "تغطية المناطق الطرفية وأطراف المدينة",
          isActive: true,
        },
        {
          branchId: branch._id,
          name: `خط الطوارئ والدعم - ${spec.name}`,
          description: "خط احتياطي للتدخل السريع عند الامتلاء",
          isActive: true,
        },
      ]);

      const vehicleCount = 22;
      const vehiclesPayload = Array.from({ length: vehicleCount }).map((_, idx) => {
        const vehicleType = vehicleTypes[idx % vehicleTypes.length];
        const driver = drivers[idx % drivers.length];
        return {
          branchId: branch._id,
          name: `${organization.labels.vehicleLabel} ${formatIndex(idx)} - ${spec.name}`,
          plateNumber: `${vehicleType.short}-${spec.zoneSeed + idx + 1}`,
          imei: String(spec.zoneSeed + 1000 + idx + 1).padStart(15, "3"),
          driverId: driver._id,
          routeId: routes[idx % routes.length]._id,
          atharObjectId: null as string | null,
          isActive: idx % 13 !== 0,
        };
      });

      if (spec.atharKey && atharObjects.length > 0) {
        const syncCount = Math.min(10, atharObjects.length, vehiclesPayload.length);
        for (let i = 0; i < syncCount; i++) {
          const atharObject = atharObjects[i] as Record<string, any>;
          const imei = String(atharObject?.imei || "").trim();
          if (!imei) continue;
          vehiclesPayload[i].imei = imei;
          vehiclesPayload[i].atharObjectId = String(
            atharObject?.id || atharObject?.object_id || atharObject?.name || imei
          );
          if (atharObject?.name) {
            vehiclesPayload[i].name = `${organization.labels.vehicleLabel} ${formatIndex(i)} - ${atharObject.name}`;
          }
          if (atharObject?.plate_number) {
            vehiclesPayload[i].plateNumber = String(atharObject.plate_number);
          }
        }
      }

      const vehicles = await Vehicle.insertMany(vehiclesPayload);

      const pointSpecs = buildPointSpecs(spec);
      const points = await Point.insertMany(
        pointSpecs.map((point) => ({
          branchId: branch._id,
          name: point.name,
          nameAr: point.nameAr,
          type: point.type,
          lat: point.lat,
          lng: point.lng,
          radiusMeters: point.radiusMeters,
          zoneId: point.zoneId,
          addressText: point.addressText,
          isActive: true,
        }))
      );

      const routeBuckets: Record<string, typeof points> = {};
      routes.forEach((route) => {
        routeBuckets[route._id.toString()] = [];
      });

      points.forEach((point, index) => {
        const route = routes[index % routes.length];
        routeBuckets[route._id.toString()].push(point);
      });

      const routePointDocs: { routeId: string; pointId: string; order: number }[] = [];
      for (const route of routes) {
        const bucket = routeBuckets[route._id.toString()];
        bucket.forEach((point, index) => {
          routePointDocs.push({ routeId: route._id.toString(), pointId: point._id.toString(), order: index });
        });
      }
      await RoutePoint.insertMany(routePointDocs);

      for (const route of routes) {
        const bucket = routeBuckets[route._id.toString()];
        const coordinates = bucket.map((point) => [point.lng, point.lat]);
        if (coordinates.length >= 2) {
          await Route.findByIdAndUpdate(route._id, {
            path: { type: "LineString", coordinates },
          });
        }
      }

      const events: any[] = [];
      const visits: any[] = [];
      const now = Date.now();
      const days = 21;

      for (let d = 0; d < days; d++) {
        const dayStart = now - d * 24 * 60 * 60 * 1000;
        for (const [vehicleIndex, vehicle] of vehicles.entries()) {
          const visitCount = randomBetween(2, 5);
          for (let v = 0; v < visitCount; v++) {
            const point = points[(vehicleIndex + v + d) % points.length];
            const driver = drivers.find((drv) => drv._id.toString() === String(vehicle.driverId));
            const minuteOffset = 6 * 60 + v * 80 + (vehicleIndex % 5) * 17;
            const start = new Date(dayStart + minuteOffset * 60 * 1000);
            const durationMinutes = randomBetween(6, 22);
            const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

            const eventNameIn = `دخول ${vehicle.name} إلى ${point.nameAr || point.name} - السائق: ${driver?.name || "غير محدد"}`;
            const eventNameOut = `خروج ${vehicle.name} من ${point.nameAr || point.name} - السائق: ${driver?.name || "غير محدد"}`;

            const eventIn = {
              branchId: branch._id,
              vehicleId: vehicle._id,
              driverId: vehicle.driverId,
              pointId: point._id,
              zoneId: point.zoneId,
              imei: vehicle.imei,
              atharEventId: `IN-${spec.zoneSeed}-${d}-${vehicleIndex}-${v}`,
              name: eventNameIn,
              driverName: driver?.name || null,
              type: "zone_in",
              eventTimestamp: start,
            };
            const eventOut = {
              branchId: branch._id,
              vehicleId: vehicle._id,
              driverId: vehicle.driverId,
              pointId: point._id,
              zoneId: point.zoneId,
              imei: vehicle.imei,
              atharEventId: `OUT-${spec.zoneSeed}-${d}-${vehicleIndex}-${v}`,
              name: eventNameOut,
              driverName: driver?.name || null,
              type: "zone_out",
              eventTimestamp: end,
            };
            events.push(eventIn, eventOut);
          }
        }
      }

      const createdEvents = await ZoneEvent.insertMany(events);
      for (let i = 0; i < createdEvents.length; i += 2) {
        const entryEvent = createdEvents[i];
        const exitEvent = createdEvents[i + 1];
        if (!exitEvent) continue;
        visits.push({
          branchId: entryEvent.branchId,
          vehicleId: entryEvent.vehicleId,
          pointId: entryEvent.pointId,
          zoneId: entryEvent.zoneId,
          entryEventId: entryEvent._id,
          exitEventId: exitEvent._id,
          entryTime: entryEvent.eventTimestamp,
          exitTime: exitEvent.eventTimestamp,
          durationSeconds: Math.max(
            0,
            Math.floor(
              (new Date(exitEvent.eventTimestamp).getTime() -
                new Date(entryEvent.eventTimestamp).getTime()) /
                1000
            )
          ),
          status: "closed",
        });
      }

      const liveVisits: any[] = [];
      const liveVehicles = vehicles.slice(0, 3);
      liveVehicles.forEach((vehicle, idx) => {
        const point = points[(idx + 2) % points.length];
        const driver = drivers.find((drv) => drv._id.toString() === String(vehicle.driverId));
        const start = new Date(Date.now() - (idx + 1) * 12 * 60 * 1000);
        const eventNameIn = `دخول ${vehicle.name} إلى ${point.nameAr || point.name} - السائق: ${driver?.name || "غير محدد"}`;

        liveVisits.push({
          branchId: branch._id,
          vehicleId: vehicle._id,
          pointId: point._id,
          zoneId: point.zoneId,
          entryEventId: null,
          exitEventId: null,
          entryTime: start,
          exitTime: null,
          durationSeconds: null,
          status: "open",
        });

        events.push({
          branchId: branch._id,
          vehicleId: vehicle._id,
          driverId: vehicle.driverId,
          pointId: point._id,
          zoneId: point.zoneId,
          imei: vehicle.imei,
          atharEventId: `LIVE-${spec.zoneSeed}-${idx}`,
          name: eventNameIn,
          driverName: driver?.name || null,
          type: "zone_in",
          eventTimestamp: start,
        });
      });

      if (liveVisits.length) {
        await ZoneEvent.insertMany(events.slice(-liveVisits.length));
        visits.push(...liveVisits);
      }

      await PointVisit.insertMany(visits);
    }

    console.log("Seed completed successfully");
    console.log("Super Admin:", appConfig.defaultAdmin.email, appConfig.defaultAdmin.password);
    console.log("Organization Admin: council@tartus.local / org-tartus-123");
    console.log("Branch Admins: <branch-code>-<zoneSeed>@municipality.local / branch-admin-123");
    console.log("Branch Users: <branch-code>-<zoneSeed>@operator.local / branch-user-123");
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
