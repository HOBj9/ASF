import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Role from "@/models/Role"

/**
 * Server-only: users, branches, and vehicles for the line-supervisors dashboard/embed.
 */
export async function loadLineSupervisorsDataset(organizationId: string) {
  await connectDB()
  const lineSupervisorRole = await Role.findOne({ name: "line_supervisor" }).select("_id").lean()
  const Branch = (await import("@/models/Branch")).default
  const branches = await Branch.find({ organizationId })
    .select("name nameAr _id")
    .sort({ name: 1 })
    .lean()
  const Vehicle = (await import("@/models/Vehicle")).default
  const branchIds = branches.map((b: { _id: unknown }) => b._id)
  const vehicles = branchIds.length
    ? await Vehicle.find({ branchId: { $in: branchIds }, isActive: true })
        .select("name plateNumber branchId trackingProvider")
        .sort({ name: 1 })
        .lean()
    : []
  const initialUsers = lineSupervisorRole
    ? await User.find({
        organizationId,
        role: (lineSupervisorRole as { _id: unknown })._id,
      })
        .populate("role", "name nameAr")
        .populate("branchId", "name nameAr")
        .populate("trackingVehicleId", "name plateNumber branchId trackingProvider")
        .sort({ createdAt: -1 })
        .lean()
    : []

  return {
    initialUsers: JSON.parse(JSON.stringify(initialUsers)),
    branches: JSON.parse(JSON.stringify(branches)),
    vehicles: JSON.parse(JSON.stringify(vehicles)),
  }
}
