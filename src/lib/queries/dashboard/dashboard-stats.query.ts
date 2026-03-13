import Branch from "@/models/Branch";
import Point from "@/models/Point";
import PointCompletion from "@/models/PointCompletion";
import PointVisit from "@/models/PointVisit";
import { AtharService } from "@/lib/services/athar.service";
import { getZonedDateString } from "@/lib/utils/timezone.util";
import type { DashboardStats } from "@/lib/contracts/dashboard";
import { measureAsync } from "@/lib/observability/perf";

function isAtharObjectActive(obj: Record<string, unknown>): boolean {
  return (
    String(obj.active ?? "").toLowerCase() === "true" ||
    String(obj.loc_valid ?? "") === "1"
  );
}

export async function getDashboardStats(branchId: string): Promise<DashboardStats> {
  return measureAsync(
    "dashboard.getStats",
    async () => {
      const branch = await Branch.findById(branchId).select("timezone").lean();
      if (!branch) {
        const error = new Error("الفرع غير موجود");
        (error as any).status = 404;
        throw error;
      }

      const timezone = branch.timezone || "Asia/Damascus";
      const completionDateToday = getZonedDateString(timezone, new Date());

      const [activeVehicleIds, activePointIds, visitedPointsToday, totalPoints] =
        await Promise.all([
          PointVisit.distinct("vehicleId", { branchId, status: "open" }),
          PointVisit.distinct("pointId", { branchId, status: "open" }),
          PointCompletion.countDocuments({
            branchId,
            completionDate: completionDateToday,
          }),
          Point.countDocuments({ branchId, isActive: true }),
        ]);

      const dailyCompletionPercent =
        totalPoints === 0 ? 0 : Math.round((visitedPointsToday / totalPoints) * 100);

      let activeVehicles = activeVehicleIds.length;
      let activePoints = activePointIds.length;

      try {
        const atharService = await AtharService.forBranch(branchId);
        const objectsRaw = await atharService.getObjects();
        const activeCount = (objectsRaw as Record<string, unknown>[]).filter(isAtharObjectActive).length;
        activeVehicles = activeCount;
        activePoints = activeCount;
      } catch {
        // Fall back to DB-derived values when Athar is unavailable.
      }

      return {
        activeVehicles,
        activePoints,
        dailyCompletionPercent,
        totalPoints,
        visitedPointsToday,
      };
    },
    { meta: { branchId } },
  );
}
