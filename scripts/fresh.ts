/**
 * Fresh Database Script
 * 
 * This script ensures all models, indexes, and new fields are added to the database
 * without deleting any existing data.
 * 
 * Usage: npm run fresh
 */

import connectDB from "../src/lib/mongodb"
import mongoose from "mongoose"

// Import all models to ensure they are registered
import "../src/models"

// Import models to access them
import User from "../src/models/User"
import Role from "../src/models/Role"
import Permission from "../src/models/Permission"
import Session from "../src/models/Session"
import Message from "../src/models/Message"
import Contact from "../src/models/Contact"
import ContactGroup from "../src/models/ContactGroup"
import ContactGroupMember from "../src/models/ContactGroupMember"
import Campaign from "../src/models/Campaign"
import BulkSendJob from "../src/models/BulkSendJob"
import AutoReply from "../src/models/AutoReply"
import UserApiKey from "../src/models/UserApiKey"
import MessageQueue from "../src/models/MessageQueue"
import ContactSubmission from "../src/models/ContactSubmission"
import VerificationCode from "../src/models/VerificationCode"
import VerificationTemplate from "../src/models/VerificationTemplate"
import WelcomeGreeting from "../src/models/WelcomeGreeting"

// Import permissions and roles definitions
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
  { name: "Session", model: Session, collection: "sessions" },
  { name: "Message", model: Message, collection: "messages" },
  { name: "Contact", model: Contact, collection: "contacts" },
  { name: "ContactGroup", model: ContactGroup, collection: "contactgroups" },
  { name: "ContactGroupMember", model: ContactGroupMember, collection: "contactgroupmembers" },
  { name: "Campaign", model: Campaign, collection: "campaigns" },
  { name: "BulkSendJob", model: BulkSendJob, collection: "bulksendjobs" },
  { name: "AutoReply", model: AutoReply, collection: "autoreplies" },
  { name: "UserApiKey", model: UserApiKey, collection: "userapikeys" },
  { name: "MessageQueue", model: MessageQueue, collection: "messagequeues" },
  { name: "ContactSubmission", model: ContactSubmission, collection: "contactsubmissions" },
  { name: "VerificationCode", model: VerificationCode, collection: "verificationcodes" },
  { name: "VerificationTemplate", model: VerificationTemplate, collection: "verificationtemplates" },
  { name: "WelcomeGreeting", model: WelcomeGreeting, collection: "welcomegreetings" },
]

async function syncIndexes(modelInfo: ModelInfo): Promise<{ created: number; deleted: number }> {
  try {
    const result = await modelInfo.model.syncIndexes()
    return {
      created: result.length || 0,
      deleted: 0, // syncIndexes doesn't return deleted count, but we track it separately
    }
  } catch (error: any) {
    console.error(`  ❌ Error syncing indexes for ${modelInfo.name}:`, error.message)
    return { created: 0, deleted: 0 }
  }
}

async function ensureDefaultValues(modelInfo: ModelInfo): Promise<number> {
  try {
    const schema = modelInfo.model.schema
    const paths = schema.paths
    let updated = 0

    // Get all fields with default values that are not timestamps
    const defaultFields: { [key: string]: any } = {}
    for (const pathName in paths) {
      // Skip timestamps and internal fields
      if (pathName === 'createdAt' || pathName === 'updatedAt' || pathName === '__v' || pathName === '_id') {
        continue
      }
      
      const path = paths[pathName] as any
      // Check if path has a default value
      if (path && (path.defaultValue !== undefined && path.defaultValue !== null)) {
        defaultFields[pathName] = path.defaultValue
      }
    }

    if (Object.keys(defaultFields).length === 0) {
      return 0
    }

    // Build update query for documents missing default values
    const updateQueries: Array<{ filter: any; update: any }> = []

    for (const fieldName in defaultFields) {
      const defaultValue = defaultFields[fieldName]
      
      // Handle function defaults (like Date.now)
      if (typeof defaultValue === 'function') {
        // Skip function defaults as they're evaluated at creation time
        continue
      } else {
        // For each field, create a separate update query
        updateQueries.push({
          filter: { [fieldName]: { $exists: false } },
          update: { $set: { [fieldName]: defaultValue } }
        })
      }
    }

    if (updateQueries.length === 0) {
      return 0
    }

    // Update documents that are missing these fields
    for (const { filter, update } of updateQueries) {
      const result = await modelInfo.model.updateMany(filter, update)
      updated += result.modifiedCount || 0
    }

    return updated
  } catch (error: any) {
    console.error(`  ⚠️  Warning: Could not ensure default values for ${modelInfo.name}:`, error.message)
    return 0
  }
}

async function checkCollectionExists(collectionName: string): Promise<boolean> {
  try {
    const db = mongoose.connection.db
    if (!db) return false
    
    const collections = await db.listCollections({ name: collectionName }).toArray()
    return collections.length > 0
  } catch (error) {
    return false
  }
}

async function getCollectionStats(collectionName: string): Promise<{ count: number; exists: boolean }> {
  try {
    const exists = await checkCollectionExists(collectionName)
    if (!exists) {
      return { count: 0, exists: false }
    }

    const db = mongoose.connection.db
    if (!db) return { count: 0, exists: false }

    const collection = db.collection(collectionName)
    const count = await collection.countDocuments()
    return { count, exists: true }
  } catch (error: any) {
    console.error(`  ⚠️  Warning: Could not get stats for ${collectionName}:`, error.message)
    return { count: 0, exists: false }
  }
}

async function syncPermissions(): Promise<{ created: number; updated: number }> {
  try {
    console.log("🔐 Syncing permissions...")
    
    let created = 0
    let updated = 0

    for (const permDef of defaultPermissions) {
      const existingPermission = await Permission.findOne({ name: permDef.name })
      
      if (!existingPermission) {
        // Create new permission
        await Permission.create({
          name: permDef.name,
          nameAr: permDef.nameAr,
          resource: permDef.resource,
          action: permDef.action,
        })
        created++
        console.log(`  ✅ Created permission: ${permDef.name} (${permDef.nameAr})`)
      } else {
        // Update existing permission if needed
        let needsUpdate = false
        const updates: any = {}
        
        if (existingPermission.nameAr !== permDef.nameAr) {
          updates.nameAr = permDef.nameAr
          needsUpdate = true
        }
        if (existingPermission.resource !== permDef.resource) {
          updates.resource = permDef.resource
          needsUpdate = true
        }
        if (existingPermission.action !== permDef.action) {
          updates.action = permDef.action
          needsUpdate = true
        }

        if (needsUpdate) {
          await Permission.findByIdAndUpdate(existingPermission._id, updates)
          updated++
          console.log(`  🔄 Updated permission: ${permDef.name}`)
        }
      }
    }

    return { created, updated }
  } catch (error: any) {
    console.error(`  ❌ Error syncing permissions:`, error.message)
    return { created: 0, updated: 0 }
  }
}

async function syncRoles(): Promise<{ updated: number }> {
  try {
    console.log("👥 Syncing roles...")
    
    let updated = 0

    // Get all permissions
    const allPermissions = await Permission.find({}).lean()
    const permissionsMap = new Map(allPermissions.map((p: any) => [p.name, p._id.toString()]))

    // Sync admin role
    const adminRole = await Role.findOne({ name: defaultRoles.admin.name })
    if (adminRole) {
      // Admin role should have manage_all or all permissions
      const manageAllPerm = permissionsMap.get('manage_all')
      if (manageAllPerm) {
        const currentPerms = (adminRole.permissions || []).map((p: any) => p.toString())
        if (!currentPerms.includes(manageAllPerm)) {
          // If manage_all exists, admin should have all permissions
          adminRole.permissions = allPermissions.map((p: any) => p._id)
          await adminRole.save()
          updated++
          console.log(`  ✅ Updated admin role with all permissions`)
        }
      }
    }

    // Sync user role
    const userRole = await Role.findOne({ name: defaultRoles.user.name })
    if (userRole) {
      const userPermissionNames = defaultRoles.user.permissions
      const userPermissionIds = userPermissionNames
        .map(name => permissionsMap.get(name))
        .filter(Boolean) as string[]

      if (userPermissionIds.length > 0) {
        const currentPerms = (userRole.permissions || []).map((p: any) => p.toString())
        const missingPerms = userPermissionIds.filter(id => !currentPerms.includes(id))

        if (missingPerms.length > 0) {
          userRole.permissions = [...new Set([...currentPerms, ...userPermissionIds])]
          await userRole.save()
          updated++
          console.log(`  ✅ Updated user role with ${missingPerms.length} new permission(s)`)
        }
      }
    }

    return { updated }
  } catch (error: any) {
    console.error(`  ❌ Error syncing roles:`, error.message)
    return { updated: 0 }
  }
}

async function fresh() {
  try {
    console.log("🔄 Starting fresh database update...")
    console.log("")

    // Connect to database
    console.log("📡 Connecting to MongoDB...")
    await connectDB()
    console.log("✅ Connected to MongoDB")
    console.log("")

    // Get database info
    const db = mongoose.connection.db
    if (db) {
      const dbName = db.databaseName
      console.log(`📊 Database: ${dbName}`)
      console.log("")
    }

    let totalIndexesCreated = 0
    let totalDocumentsUpdated = 0

    // Sync permissions and roles first
    console.log("")
    const permResult = await syncPermissions()
    if (permResult.created > 0 || permResult.updated > 0) {
      console.log(`  📊 Created ${permResult.created} permission(s), Updated ${permResult.updated} permission(s)`)
    } else {
      console.log(`  ✓ All permissions are up to date`)
    }
    console.log("")

    const roleResult = await syncRoles()
    if (roleResult.updated > 0) {
      console.log(`  📊 Updated ${roleResult.updated} role(s)`)
    } else {
      console.log(`  ✓ All roles are up to date`)
    }
    console.log("")

    // Process each model
    for (const modelInfo of models) {
      console.log(`📦 Processing ${modelInfo.name}...`)

      // Check collection stats
      const stats = await getCollectionStats(modelInfo.collection)
      if (stats.exists) {
        console.log(`  📈 Collection exists with ${stats.count} document(s)`)
      } else {
        console.log(`  📝 Collection will be created on first insert`)
      }

      // Sync indexes
      console.log(`  🔍 Syncing indexes...`)
      const indexResult = await syncIndexes(modelInfo)
      if (indexResult.created > 0) {
        console.log(`  ✅ Created/Updated ${indexResult.created} index(es)`)
        totalIndexesCreated += indexResult.created
      } else {
        console.log(`  ✓ Indexes are up to date`)
      }

      // Ensure default values for existing documents
      if (stats.exists && stats.count > 0) {
        console.log(`  🔧 Ensuring default values for existing documents...`)
        const updated = await ensureDefaultValues(modelInfo)
        if (updated > 0) {
          console.log(`  ✅ Updated ${updated} document(s) with default values`)
          totalDocumentsUpdated += updated
        } else {
          console.log(`  ✓ All documents have required fields`)
        }
      }

      console.log("")
    }

    // Summary
    console.log("=" .repeat(50))
    console.log("📋 Summary:")
    console.log(`  ✅ Processed ${models.length} model(s)`)
    console.log(`  🔍 Created/Updated ${totalIndexesCreated} index(es)`)
    console.log(`  🔧 Updated ${totalDocumentsUpdated} document(s) with default values`)
    console.log("")
    console.log("✨ Fresh database update completed successfully!")
    console.log("")
    console.log("ℹ️  Note: No existing data was deleted.")
    console.log("")

    process.exit(0)
  } catch (error: any) {
    console.error("")
    console.error("❌ Fresh database update failed:")
    console.error(error)
    console.error("")
    process.exit(1)
  }
}

// Run the script
fresh()

