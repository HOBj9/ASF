/**
 * Fresh Database Script
 *
 * Syncs indexes and ensures default values without deleting data.
 * Usage: npm run fresh
 */

import connectDB from "../src/lib/mongodb"
import mongoose from "mongoose"

// Register all models
import "../src/models"

import Permission from "../src/models/Permission"
import Role from "../src/models/Role"
import User from "../src/models/User"
import Organization from "../src/models/Organization"
import Branch from "../src/models/Branch"
import Driver from "../src/models/Driver"
import Vehicle from "../src/models/Vehicle"
import Point from "../src/models/Point"
import Route from "../src/models/Route"
import RoutePoint from "../src/models/RoutePoint"
import ZoneEvent from "../src/models/ZoneEvent"
import PointVisit from "../src/models/PointVisit"

import { defaultPermissions, defaultRoles } from "../src/constants/permissions"

interface ModelInfo {
  name: string
  model: mongoose.Model<any>
  collection: string
}

const models: ModelInfo[] = [
  { name: "Permission", model: Permission, collection: "permissions" },
  { name: "Role", model: Role, collection: "roles" },
  { name: "User", model: User, collection: "users" },
  { name: "Organization", model: Organization, collection: "organizations" },
  { name: "Branch", model: Branch, collection: "branches" },
  { name: "Driver", model: Driver, collection: "drivers" },
  { name: "Vehicle", model: Vehicle, collection: "vehicles" },
  { name: "Point", model: Point, collection: "points" },
  { name: "Route", model: Route, collection: "routes" },
  { name: "RoutePoint", model: RoutePoint, collection: "routepoints" },
  { name: "ZoneEvent", model: ZoneEvent, collection: "zoneevents" },
  { name: "PointVisit", model: PointVisit, collection: "pointvisits" },
]

async function syncIndexes(modelInfo: ModelInfo): Promise<number> {
  try {
    const result = await modelInfo.model.syncIndexes()
    return result.length || 0
  } catch (error: any) {
    console.error(`Error syncing indexes for ${modelInfo.name}:`, error.message)
    return 0
  }
}

async function ensureDefaultValues(modelInfo: ModelInfo): Promise<number> {
  try {
    const schema = modelInfo.model.schema
    const paths = schema.paths
    let updated = 0

    const defaultFields: Record<string, any> = {}
    for (const pathName in paths) {
      if (pathName === "createdAt" || pathName === "updatedAt" || pathName === "__v" || pathName === "_id") {
        continue
      }
      const path = paths[pathName] as any
      if (path && path.defaultValue !== undefined && path.defaultValue !== null) {
        if (typeof path.defaultValue !== "function") {
          defaultFields[pathName] = path.defaultValue
        }
      }
    }

    for (const fieldName in defaultFields) {
      const result = await modelInfo.model.updateMany(
        { [fieldName]: { $exists: false } },
        { $set: { [fieldName]: defaultFields[fieldName] } }
      )
      updated += result.modifiedCount || 0
    }

    return updated
  } catch (error: any) {
    console.warn(`Warning ensuring defaults for ${modelInfo.name}:`, error.message)
    return 0
  }
}

async function syncPermissions(): Promise<{ created: number; updated: number }> {
  let created = 0
  let updated = 0

  for (const permDef of defaultPermissions) {
    const existing = await Permission.findOne({ name: permDef.name })
    if (!existing) {
      await Permission.create({
        name: permDef.name,
        nameAr: permDef.nameAr,
        resource: permDef.resource,
        action: permDef.action,
      })
      created++
    } else {
      const updates: any = {}
      if (existing.nameAr !== permDef.nameAr) updates.nameAr = permDef.nameAr
      if (existing.resource !== permDef.resource) updates.resource = permDef.resource
      if (existing.action !== permDef.action) updates.action = permDef.action
      if (Object.keys(updates).length > 0) {
        await Permission.findByIdAndUpdate(existing._id, updates)
        updated++
      }
    }
  }

  return { created, updated }
}

async function syncRoles(): Promise<number> {
  let updated = 0
  const allPermissions = await Permission.find({}).lean()
  const permissionsMap = new Map(allPermissions.map((p: any) => [p.name, p._id.toString()]))

  const roleDefs = Object.values(defaultRoles)
  for (const roleDef of roleDefs) {
    const role = await Role.findOne({ name: roleDef.name })
    if (!role) continue

    if (roleDef.name === defaultRoles.superAdmin.name) {
      const manageAllPerm = permissionsMap.get("manage_all")
      if (manageAllPerm) {
        const currentPerms = (role.permissions || []).map((p: any) => p.toString())
        if (!currentPerms.includes(manageAllPerm)) {
          role.permissions = allPermissions.map((p: any) => p._id)
          await role.save()
          updated++
        }
      }
      continue
    }

    const permissionIds = (roleDef.permissions || [])
      .map((name: string) => permissionsMap.get(name))
      .filter(Boolean) as string[]

    if (permissionIds.length > 0) {
      const currentPerms = (role.permissions || []).map((p: any) => p.toString())
      const missingPerms = permissionIds.filter((id) => !currentPerms.includes(id))
      if (missingPerms.length > 0) {
        role.permissions = [...new Set([...currentPerms, ...permissionIds])]
        await role.save()
        updated++
      }
    }
  }

  return updated
}

async function fresh() {
  try {
    console.log("Starting fresh database update...")
    await connectDB()

    const permResult = await syncPermissions()
    if (permResult.created || permResult.updated) {
      console.log(`Permissions: created ${permResult.created}, updated ${permResult.updated}`)
    }

    const roleUpdated = await syncRoles()
    if (roleUpdated) {
      console.log(`Roles updated: ${roleUpdated}`)
    }

    let totalIndexes = 0
    let totalDefaults = 0

    for (const modelInfo of models) {
      const createdIndexes = await syncIndexes(modelInfo)
      totalIndexes += createdIndexes
      const updatedDefaults = await ensureDefaultValues(modelInfo)
      totalDefaults += updatedDefaults
    }

    console.log(`Indexes updated: ${totalIndexes}`)
    console.log(`Defaults applied: ${totalDefaults}`)
    console.log("Fresh update completed")
    process.exit(0)
  } catch (error) {
    console.error("Fresh update failed:", error)
    process.exit(1)
  }
}

fresh()
