import connectDB from "@/lib/mongodb"
import bcrypt from "bcryptjs"

import Permission from "@/models/Permission"
import Role from "@/models/Role"
import User from "@/models/User"
import Municipality from "@/models/Municipality"
import Driver from "@/models/Driver"
import Vehicle from "@/models/Vehicle"
import Point from "@/models/Point"
import Route from "@/models/Route"
import RoutePoint from "@/models/RoutePoint"
import ZoneEvent from "@/models/ZoneEvent"
import PointVisit from "@/models/PointVisit"

import { defaultPermissions, defaultRoles } from "@/constants/permissions"
import { appConfig } from "@/lib/config/app.config"

async function seed() {
  try {
    await connectDB()
    console.log("Connected to MongoDB")

    await Promise.all([
      Permission.deleteMany({}),
      Role.deleteMany({}),
      User.deleteMany({}),
      Municipality.deleteMany({}),
      Driver.deleteMany({}),
      Vehicle.deleteMany({}),
      Point.deleteMany({}),
      Route.deleteMany({}),
      RoutePoint.deleteMany({}),
      ZoneEvent.deleteMany({}),
      PointVisit.deleteMany({}),
    ])

    // Permissions
    const permissions = await Permission.insertMany(
      defaultPermissions.map((perm) => ({
        name: perm.name,
        nameAr: perm.nameAr,
        resource: perm.resource,
        action: perm.action,
      }))
    )

    const permMap = new Map(permissions.map((p: any) => [p.name, p._id]))

    // Roles
    const adminRole = await Role.create({
      name: defaultRoles.admin.name,
      nameAr: defaultRoles.admin.nameAr,
      permissions: permissions.map((p: any) => p._id),
    })

    const userRole = await Role.create({
      name: defaultRoles.user.name,
      nameAr: defaultRoles.user.nameAr,
      permissions: defaultRoles.user.permissions.map((name) => permMap.get(name)).filter(Boolean),
    })

    const municipalityRole = await Role.create({
      name: defaultRoles.municipalityAdmin.name,
      nameAr: defaultRoles.municipalityAdmin.nameAr,
      permissions: defaultRoles.municipalityAdmin.permissions
        .map((name) => permMap.get(name))
        .filter(Boolean),
    })

    // Users
    const adminPassword = await bcrypt.hash(appConfig.defaultAdmin.password, 10)
    const adminUser = await User.create({
      name: appConfig.defaultAdmin.name,
      email: appConfig.defaultAdmin.email,
      password: adminPassword,
      role: adminRole._id,
      isActive: true,
    })

    const userPassword = await bcrypt.hash(appConfig.defaultUser.password, 10)
    const regularUser = await User.create({
      name: appConfig.defaultUser.name,
      email: appConfig.defaultUser.email,
      password: userPassword,
      role: userRole._id,
      isActive: true,
    })

    const municipalitySpecs = [
      {
        name: "بلدية دمشق",
        governorate: "دمشق",
        areaName: "مركز المدينة",
        addressText: "دمشق - ساحة الأمويين",
        centerLat: 33.5138,
        centerLng: 36.2765,
        slug: "damascus",
        zoneSeed: 10000,
      },
      {
        name: "بلدية حلب",
        governorate: "حلب",
        areaName: "وسط المدينة",
        addressText: "حلب - ساحة سعدالله الجابري",
        centerLat: 36.2021,
        centerLng: 37.1343,
        slug: "aleppo",
        zoneSeed: 20000,
      },
    ]

    const municipalities = []
    for (const spec of municipalitySpecs) {
      const municipality = await Municipality.create({
        name: spec.name,
        nameAr: spec.name,
        governorate: spec.governorate,
        areaName: spec.areaName,
        addressText: spec.addressText,
        centerLat: spec.centerLat,
        centerLng: spec.centerLng,
        timezone: "Asia/Damascus",
        atharKey: process.env.ATHAR_TEST_KEY || null,
        isActive: true,
      })
      municipalities.push({ ...spec, municipality })

      const municipalityPassword = await bcrypt.hash("municipality123", 10)
      await User.create({
        name: `مدير ${spec.name}`,
        email: `${spec.slug}@municipality.local`,
        password: municipalityPassword,
        role: municipalityRole._id,
        municipalityId: municipality._id,
        isActive: true,
      })
    }

    for (const entry of municipalities) {
      const municipality = entry.municipality
      const driverCount = 6
      const drivers = await Driver.insertMany(
        Array.from({ length: driverCount }).map((_, idx) => ({
          municipalityId: municipality._id,
          name: `سائق تشغيل ${idx + 1} - ${municipality.name}`,
          phone: `09${entry.zoneSeed + idx}`.slice(0, 10),
          isActive: true,
        }))
      )

      const routes = await Route.insertMany([
        {
          municipalityId: municipality._id,
          name: `مسار جمع النفايات - شمال ${municipality.name}`,
          description: "مسار جمع رئيسي للمنطقة الشمالية",
          isActive: true,
        },
        {
          municipalityId: municipality._id,
          name: `مسار جمع النفايات - وسط ${municipality.name}`,
          description: "مسار جمع رئيسي للمنطقة الوسطى",
          isActive: true,
        },
        {
          municipalityId: municipality._id,
          name: `مسار جمع النفايات - جنوب ${municipality.name}`,
          description: "مسار جمع رئيسي للمنطقة الجنوبية",
          isActive: true,
        },
      ])

      const vehicleCount = 8
      const vehicles = await Vehicle.insertMany(
        Array.from({ length: vehicleCount }).map((_, idx) => ({
          municipalityId: municipality._id,
          name: `${idx % 2 === 0 ? "شاحنة جمع" : "مركبة دعم"} رقم ${idx + 1} - ${municipality.name}`,
          plateNumber: `GC-${entry.zoneSeed + idx + 1}`,
          imei: String(entry.zoneSeed + 1000 + idx + 1).padEnd(15, "0"),
          driverId: drivers[idx % drivers.length]._id,
          routeId: routes[idx % routes.length]._id,
          isActive: idx % 7 !== 0,
        }))
      )

      const pointTypes = [
        "container",
        "container",
        "container",
        "station",
        "container",
        "facility",
        "container",
        "container",
        "station",
        "container",
        "facility",
        "other",
        "container",
        "container",
        "container",
        "station",
      ]

      const points = await Point.insertMany(
        Array.from({ length: pointTypes.length }).map((_, idx) => {
          const type = pointTypes[idx]
          const label =
            type === "container"
              ? "حاوية"
              : type === "station"
                ? "محطة تجميع"
                : type === "facility"
                  ? "منشأة فرز"
                  : "نقطة دعم"

          return {
            municipalityId: municipality._id,
            name: `${label} رقم ${idx + 1} - ${municipality.name}`,
            nameAr: `${label} رقم ${idx + 1} - ${municipality.name}`,
            type,
            lat: municipality.centerLat + Math.floor(idx / 4) * 0.0025,
            lng: municipality.centerLng + (idx % 4) * 0.0025,
            radiusMeters: 120 + (idx % 4) * 30,
            zoneId: String(entry.zoneSeed + idx + 1),
            isActive: true,
          }
        })
      )

      await RoutePoint.insertMany([
        ...points.slice(0, 5).map((point, idx) => ({ routeId: routes[0]._id, pointId: point._id, order: idx })),
        ...points.slice(5, 10).map((point, idx) => ({ routeId: routes[1]._id, pointId: point._id, order: idx })),
        ...points.slice(10, 15).map((point, idx) => ({ routeId: routes[2]._id, pointId: point._id, order: idx })),
      ])

      const events: any[] = []
      const visits: any[] = []
      const now = Date.now()
      const days = 7
      const visitsPerDay = 4

      for (let d = 0; d < days; d++) {
        for (const [vehicleIndex, vehicle] of vehicles.entries()) {
          for (let p = 0; p < visitsPerDay; p++) {
            const point = points[(p + d + vehicleIndex) % points.length]
            const start = new Date(
              now - d * 24 * 60 * 60 * 1000 - p * 75 * 60 * 1000 - vehicleIndex * 7 * 60 * 1000
            )
            const end = new Date(start.getTime() + (6 + (p % 3) * 3) * 60 * 1000)
            const driver = drivers.find((drv) => drv._id.toString() === String(vehicle.driverId))
            const eventNameIn = `دخول المركبة إلى ${point.nameAr || point.name}`
            const eventNameOut = `خروج المركبة من ${point.nameAr || point.name}`

            const eventIn = {
              municipalityId: municipality._id,
              vehicleId: vehicle._id,
              driverId: vehicle.driverId,
              pointId: point._id,
              zoneId: point.zoneId,
              imei: vehicle.imei,
              atharEventId: `${entry.zoneSeed + d}${vehicle._id.toString().slice(-3)}${p}1`,
              name: eventNameIn,
              driverName: driver?.name || null,
              type: "zone_in",
              eventTimestamp: start,
            }
            const eventOut = {
              municipalityId: municipality._id,
              vehicleId: vehicle._id,
              driverId: vehicle.driverId,
              pointId: point._id,
              zoneId: point.zoneId,
              imei: vehicle.imei,
              atharEventId: `${entry.zoneSeed + d}${vehicle._id.toString().slice(-3)}${p}2`,
              name: eventNameOut,
              driverName: driver?.name || null,
              type: "zone_out",
              eventTimestamp: end,
            }
            events.push(eventIn, eventOut)
          }
        }
      }

      const createdEvents = await ZoneEvent.insertMany(events)
      for (let i = 0; i < createdEvents.length; i += 2) {
        const entryEvent = createdEvents[i]
        const exitEvent = createdEvents[i + 1]
        if (!exitEvent) continue
        visits.push({
          municipalityId: entryEvent.municipalityId,
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
                new Date(entryEvent.eventTimestamp).getTime()) / 1000
            )
          ),
          status: "closed",
        })
      }
      await PointVisit.insertMany(visits)
    }

    console.log("Seed completed successfully")
    console.log("Admin:", appConfig.defaultAdmin.email, appConfig.defaultAdmin.password)
    console.log("User:", appConfig.defaultUser.email, appConfig.defaultUser.password)
    console.log("Municipality Users: damascus@municipality.local / aleppo@municipality.local")
    console.log("Password: municipality123")
    process.exit(0)
  } catch (error) {
    console.error("Seed error:", error)
    process.exit(1)
  }
}

seed()
