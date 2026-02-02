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
  name: string;
  addressText: string;
  centerLat: number;
  centerLng: number;
  zoneSeed: number;
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

const driverNames = [
  "???? ??? ??????",
  "???? ????",
  "????? ????",
  "????? ??????",
  "???? ??????",
  "???? ?????",
  "???? ??????",
  "???? ????",
  "???? ??????",
  "??? ??????",
  "???? ????????",
  "???? ?????",
  "???? ?????",
  "???? ??????",
  "???? ????",
  "??? ?????",
  "???? ?????",
  "???? ?????",
  "??? ?????",
  "???? ?????",
];

const vehicleTypes = [
  { label: "????? ??? ?????", short: "GC" },
  { label: "????? ??? ?????", short: "SL" },
  { label: "????? ??? ??????", short: "SP" },
  { label: "????? ??????", short: "MO" },
];

const pointTypeLabels: Record<string, string> = {
  container: "?????",
  station: "???? ?????",
  facility: "????? ???",
  other: "???? ???",
};

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function formatIndex(index: number) {
  return String(index + 1).padStart(2, "0");
}

function buildPointSpecs(spec: BranchSpec): PointSpec[] {
  const baseOffsets = [
    { lat: 0.004, lng: 0.002 },
    { lat: 0.002, lng: 0.006 },
    { lat: -0.003, lng: 0.004 },
    { lat: -0.004, lng: -0.002 },
    { lat: 0.003, lng: -0.004 },
    { lat: -0.002, lng: -0.006 },
  ];

  const pointSpecs: PointSpec[] = [];
  let zoneIndex = 1;

  spec.neighborhoods.forEach((neighborhood, neighborhoodIndex) => {
    const offset = baseOffsets[neighborhoodIndex % baseOffsets.length];

    const localPoints = [
      { type: "container", count: 3 },
      { type: "station", count: 1 },
      { type: "facility", count: 1 },
      { type: "other", count: 1 },
    ];

    localPoints.forEach(({ type, count }) => {
      for (let i = 0; i < count; i++) {
        const label = pointTypeLabels[type];
        const lat = spec.centerLat + offset.lat + (i + 1) * 0.0012;
        const lng = spec.centerLng + offset.lng + (i + 1) * 0.0013;
        const zoneId = String(spec.zoneSeed + zoneIndex).padStart(5, "0");

        pointSpecs.push({
          name: `${label} ${neighborhood} ${formatIndex(i)} - ${spec.name}`,
          nameAr: `${label} ${neighborhood} ${formatIndex(i)}`,
          type: type as PointSpec["type"],
          lat,
          lng,
          radiusMeters: randomBetween(90, 180),
          addressText: `${spec.name} - ${neighborhood}`,
          zoneId,
        });
        zoneIndex += 1;
      }
    });
  });

  return pointSpecs;
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
      name: "????? ??? ??????? ??????",
      slug: "athar-smart",
      type: "waste",
      labels: {
        branchLabel: "?????",
        pointLabel: "??????",
        vehicleLabel: "??????",
        driverLabel: "??????",
        routeLabel: "??????",
      },
      isActive: true,
    });

    const organizationPassword = await bcrypt.hash("org123", 10);
    await User.create({
      name: "???? ???????",
      email: "org@demo.local",
      password: organizationPassword,
      role: organizationRole._id,
      organizationId: organization._id,
      isActive: true,
    });

    const branchSpecs: BranchSpec[] = [
      {
        name: "????? ????",
        addressText: "???? - ???? ????????",
        centerLat: 33.5138,
        centerLng: 36.2765,
        zoneSeed: 12000,
        neighborhoods: ["???????", "?????", "???????", "????????", "???????", "??? ?????"],
      },
      {
        name: "????? ???",
        addressText: "??? - ???? ??????? ???????",
        centerLat: 36.2021,
        centerLng: 37.1343,
        zoneSeed: 22000,
        neighborhoods: ["???????", "???????", "????????", "??????????", "????????", "????????"],
      },
      {
        name: "????? ???",
        addressText: "??? - ???? ??????",
        centerLat: 34.7305,
        centerLng: 36.7093,
        zoneSeed: 32000,
        neighborhoods: ["?????", "??? ??????", "????????", "?????", "???????", "???????"],
      },
    ];

    for (let branchIndex = 0; branchIndex < branchSpecs.length; branchIndex++) {
      const spec = branchSpecs[branchIndex];
      const branch = await Branch.create({
        organizationId: organization._id,
        name: spec.name,
        nameAr: spec.name,
        branchTypeLabel: organization.labels.branchLabel,
        addressText: spec.addressText,
        centerLat: spec.centerLat,
        centerLng: spec.centerLng,
        timezone: timeZone,
        atharKey: process.env.ATHAR_TEST_KEY || null,
        isActive: true,
      });

      const branchSlug = `${spec.name.replace(/\s+/g, "").toLowerCase()}-${spec.zoneSeed}`;
      const branchPassword = await bcrypt.hash("branch123", 10);
      await User.create({
        name: `???? ${spec.name}`,
        email: `${branchSlug}@branch.local`,
        password: branchPassword,
        role: branchRole._id,
        organizationId: organization._id,
        branchId: branch._id,
        isActive: true,
      });

      const driverCount = 12;
      const drivers = await Driver.insertMany(
        Array.from({ length: driverCount }).map((_, idx) => ({
          branchId: branch._id,
          name: `${driverNames[idx % driverNames.length]} - ${spec.name}`,
          phone: `09${spec.zoneSeed + idx}`.slice(0, 10),
          isActive: idx % 9 !== 0,
        }))
      );

      const routes = await Route.insertMany([
        {
          branchId: branch._id,
          name: `???? ?????? - ${spec.name}`,
          description: "??? ??? ?????? ?????? ???????",
          isActive: true,
        },
        {
          branchId: branch._id,
          name: `???? ????? - ${spec.name}`,
          description: "????? ????? ??????? ?????? ???????",
          isActive: true,
        },
        {
          branchId: branch._id,
          name: `???? ?????? - ${spec.name}`,
          description: "???? ?????? ??????? ????????",
          isActive: true,
        },
        {
          branchId: branch._id,
          name: `???? ??????? - ${spec.name}`,
          description: "???? ??? ???????? ???????? ???????????",
          isActive: true,
        },
      ]);

      const vehicleCount = 14;
      const vehicles = await Vehicle.insertMany(
        Array.from({ length: vehicleCount }).map((_, idx) => {
          const vehicleType = vehicleTypes[idx % vehicleTypes.length];
          const driver = drivers[idx % drivers.length];
          return {
            branchId: branch._id,
            name: `${vehicleType.label} ${formatIndex(idx)} - ${spec.name}`,
            plateNumber: `${vehicleType.short}-${spec.zoneSeed + idx + 1}`,
            imei: String(spec.zoneSeed + 1000 + idx + 1).padEnd(15, "0"),
            driverId: driver._id,
            routeId: routes[idx % routes.length]._id,
            isActive: idx % 10 !== 0,
          };
        })
      );

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
      const days = 14;

      for (let d = 0; d < days; d++) {
        const dayStart = now - d * 24 * 60 * 60 * 1000;
        for (const [vehicleIndex, vehicle] of vehicles.entries()) {
          const visitCount = randomBetween(3, 6);
          for (let v = 0; v < visitCount; v++) {
            const point = points[(vehicleIndex + v + d) % points.length];
            const driver = drivers.find((drv) => drv._id.toString() === String(vehicle.driverId));
            const start = new Date(dayStart - v * 55 * 60 * 1000 - vehicleIndex * 9 * 60 * 1000);
            const durationMinutes = randomBetween(5, 16);
            const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

            const eventNameIn = `???? ${vehicle.name} ??? ${point.nameAr || point.name} ? ??????: ${driver?.name || ""}`;
            const eventNameOut = `???? ${vehicle.name} ?? ${point.nameAr || point.name} ? ??????: ${driver?.name || ""}`;

            const eventIn = {
              branchId: branch._id,
              vehicleId: vehicle._id,
              driverId: vehicle.driverId,
              pointId: point._id,
              zoneId: point.zoneId,
              imei: vehicle.imei,
              atharEventId: `${spec.zoneSeed + d}${vehicle._id.toString().slice(-3)}${v}1`,
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
              atharEventId: `${spec.zoneSeed + d}${vehicle._id.toString().slice(-3)}${v}2`,
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
        const eventNameIn = `???? ${vehicle.name} ??? ${point.nameAr || point.name} ? ??????: ${driver?.name || ""}`;

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
          atharEventId: `${spec.zoneSeed}${vehicle._id.toString().slice(-3)}L${idx}`,
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

      const branchUserPassword = await bcrypt.hash("branchuser123", 10);
      await User.create({
        name: `?????? ${spec.name}`,
        email: `${branchSlug}@user.local`,
        password: branchUserPassword,
        role: branchUserRole._id,
        organizationId: organization._id,
        branchId: branch._id,
        isActive: true,
      });
    }

    console.log("Seed completed successfully");
    console.log("Super Admin:", appConfig.defaultAdmin.email, appConfig.defaultAdmin.password);
    console.log("Organization Admin: org@demo.local / org123");
    console.log("Branch Admins: <branch>@branch.local / branch123");
    console.log("Branch Users: <branch>@user.local / branchuser123");
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
