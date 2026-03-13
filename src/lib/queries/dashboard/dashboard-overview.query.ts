import connectDB from "@/lib/mongodb";
import Branch from "@/models/Branch";
import Organization from "@/models/Organization";
import { BranchService } from "@/lib/services/branch.service";
import { RouteService } from "@/lib/services/route.service";
import { getCachedEventSnapshot } from "@/lib/live/branch-live-snapshot-cache";
import { getDashboardAnalytics } from "./dashboard-analytics.query";
import { getDashboardStats } from "./dashboard-stats.query";
import { getRecentBranchEvents } from "@/lib/services/zone-event-feed.service";
import { getLabelsForSession } from "@/lib/utils/labels-server.util";
import type { DashboardOverviewData } from "@/lib/contracts/dashboard";
import { measureAsync } from "@/lib/observability/perf";

const branchService = new BranchService();
const routeService = new RouteService();

function getOrganizationNameFallback(raw: string | null | undefined): string {
  const value = String(raw || "").trim();
  return value && !/^[\s?]+$/.test(value) ? value : "المؤسسة";
}

export async function getDashboardOverview(
  session: any,
  options?: {
    branchId?: string | null;
    dailyDays?: number;
    monthlyMonths?: number;
    eventsLimit?: number;
  },
): Promise<DashboardOverviewData> {
  return measureAsync(
    "dashboard.getOverview",
    async () => {
      await connectDB();

      const selectedBranchId = options?.branchId || null;
      const organizationId = (session?.user as any)?.organizationId || null;
      const labels = await getLabelsForSession(session);
      const organization = organizationId
        ? await Organization.findById(organizationId).select("name").lean()
        : null;
      const organizationName = getOrganizationNameFallback(
        (organization as any)?.name || (session?.user as any)?.organizationName,
      );

      const orgBranches = organizationId
        ? ((await branchService.getAll(organizationId)) as Array<{ _id: any; name?: string; nameAr?: string }>).map(
            (branch) => ({
              _id: String(branch._id),
              name: branch.name,
              nameAr: branch.nameAr,
            }),
          )
        : [];

      if (!selectedBranchId) {
        return {
          branch: null,
          routes: [],
          stats: null,
          analytics: null,
          events: [],
          eventsHasMore: false,
          labels,
          organizationName,
          orgBranches,
          selectedBranchId: null,
          dailyDays: options?.dailyDays ?? 14,
          monthlyMonths: options?.monthlyMonths ?? 12,
        };
      }

      const branchDoc = await Branch.findById(selectedBranchId)
        .select("_id name addressText centerLat centerLng timezone")
        .lean();

      if (!branchDoc) {
        const error = new Error("الفرع غير موجود");
        (error as any).status = 404;
        throw error;
      }

      const [routes, stats, analytics, events] = await Promise.all([
        routeService.getAll(selectedBranchId),
        getDashboardStats(selectedBranchId),
        getDashboardAnalytics(selectedBranchId, {
          dailyDays: options?.dailyDays,
          monthlyMonths: options?.monthlyMonths,
        }),
        getCachedEventSnapshot(selectedBranchId, options?.eventsLimit ?? 10, 0, async () =>
          getRecentBranchEvents(selectedBranchId, options?.eventsLimit ?? 10, branchDoc.timezone || "Asia/Damascus", 0),
        ),
      ]);

      return {
        branch: {
          _id: String(branchDoc._id),
          name: branchDoc.name,
          addressText: branchDoc.addressText,
          centerLat: branchDoc.centerLat,
          centerLng: branchDoc.centerLng,
          timezone: branchDoc.timezone,
        },
        routes: routes.map((route: any) => ({
          _id: String(route._id),
          name: route.name,
          path: route.path,
        })),
        stats,
        analytics,
        events,
        eventsHasMore: events.length >= (options?.eventsLimit ?? 10),
        labels,
        organizationName,
        orgBranches,
        selectedBranchId,
        dailyDays: options?.dailyDays ?? 14,
        monthlyMonths: options?.monthlyMonths ?? 12,
      };
    },
    { meta: { branchId: options?.branchId || null } },
  );
}
