"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { useBranches } from "@/hooks/queries/use-branches";
import { useOrganizations } from "@/hooks/queries/use-organizations";
import { isAdmin, isOrganizationAdmin } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { RouteStatsPanel } from "@/components/municipality/route-stats-panel";
import { Loading } from "@/components/ui/loading";

type RouteItem = { _id: string; name: string; color?: string; workScheduleId?: string | null; branchId?: string };
type BranchItem = { _id: string; name: string; nameAr?: string };
type OrganizationItem = { _id: string; name: string };

export function RouteStatsPageClient({
  routeId,
  labels,
}: {
  routeId: string;
  labels: { routeLabel?: string; pointLabel?: string; vehicleLabel?: string };
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchIdFromUrl = searchParams.get("branchId");

  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState(branchIdFromUrl || "");
  const [route, setRoute] = useState<RouteItem | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [error, setError] = useState("");

  const userIsAdmin = isAdmin(session?.user?.role as any);
  const userIsOrgAdmin = isOrganizationAdmin(session?.user?.role as any);
  const sessionBranchId = (session?.user as any)?.branchId ?? null;
  const needsBranchSelector = userIsAdmin || (userIsOrgAdmin && !sessionBranchId);
  const resolvedBranchId = needsBranchSelector ? selectedBranchId : (branchIdFromUrl || sessionBranchId);

  const { data: organizations = [] } = useOrganizations(Boolean(session && userIsAdmin));
  const branchesAdminQuery = useBranches({
    organizationId: selectedOrganizationId || null,
    enabled: Boolean(session && userIsAdmin && !!selectedOrganizationId),
  });
  const branchesSessionQuery = useBranches({
    organizationId: null,
    enabled: Boolean(session && userIsOrgAdmin && !sessionBranchId),
  });
  const branches = ((userIsAdmin ? branchesAdminQuery.data : branchesSessionQuery.data) ?? []) as BranchItem[];

  const loadRoute = useCallback(async () => {
    if (!resolvedBranchId) {
      setRoute(null);
      setLoadingRoute(false);
      return;
    }

    setLoadingRoute(true);
    setError("");
    try {
      const res: any = await apiClient.get(`/routes/${routeId}?branchId=${encodeURIComponent(resolvedBranchId)}`);
      const currentRoute = res.route || res.data?.route;

      if (!currentRoute) {
        setRoute(null);
        setError("المسار غير موجود");
        return;
      }

      setRoute(currentRoute);
    } catch (err: any) {
      setRoute(null);
      setError(err.message || "فشل تحميل المسار");
    } finally {
      setLoadingRoute(false);
    }
  }, [resolvedBranchId, routeId]);

  useEffect(() => {
    if (branchIdFromUrl) {
      setSelectedBranchId(branchIdFromUrl);
    }
  }, [branchIdFromUrl]);

  useEffect(() => {
    if (userIsAdmin && organizations.length === 1 && !selectedOrganizationId) {
      setSelectedOrganizationId(organizations[0]._id);
    }
  }, [organizations, selectedOrganizationId, userIsAdmin]);

  useEffect(() => {
    if (userIsOrgAdmin && !sessionBranchId && branches.length === 1 && !selectedBranchId && !branchIdFromUrl) {
      setSelectedBranchId(branches[0]._id);
    }
  }, [branchIdFromUrl, branches, selectedBranchId, sessionBranchId, userIsOrgAdmin]);

  useEffect(() => {
    if (!userIsAdmin || !selectedOrganizationId) return;
    if (branches.length === 1 && !selectedBranchId && !branchIdFromUrl) {
      setSelectedBranchId(branches[0]._id);
    }
  }, [branchIdFromUrl, branches, selectedBranchId, selectedOrganizationId, userIsAdmin]);

  useEffect(() => {
    if (sessionBranchId && !branchIdFromUrl && !userIsAdmin) {
      setSelectedBranchId(sessionBranchId);
    }
  }, [branchIdFromUrl, sessionBranchId, userIsAdmin]);

  useEffect(() => {
    if (userIsAdmin && selectedOrganizationId && !branchIdFromUrl) {
      setSelectedBranchId("");
    }
  }, [branchIdFromUrl, selectedOrganizationId, userIsAdmin]);

  useEffect(() => {
    void loadRoute();
  }, [loadRoute]);

  const handleLinkWorkSchedule = () => {
    const q = new URLSearchParams();
    if (resolvedBranchId) q.set("branchId", resolvedBranchId);
    q.set("edit", routeId);
    router.push(`/dashboard/routes?${q}`);
  };

  if (!resolvedBranchId && needsBranchSelector) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          {userIsAdmin && (
            <div>
              <Label>المؤسسة</Label>
              <Select value={selectedOrganizationId} onValueChange={setSelectedOrganizationId}>
                <SelectTrigger className="mt-1 w-[200px]">
                  <SelectValue placeholder="اختر المؤسسة" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((organization) => (
                    <SelectItem key={organization._id} value={organization._id}>
                      {organization.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>الفرع</Label>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger className="mt-1 w-[200px]">
                <SelectValue placeholder="اختر الفرع" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branchItem) => (
                  <SelectItem key={branchItem._id} value={branchItem._id}>
                    {branchItem.nameAr || branchItem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-muted-foreground">يرجى تحديد الفرع لعرض الإحصائيات.</p>
      </div>
    );
  }

  if (loadingRoute) {
    return (
      <div className="flex justify-center py-12">
        <Loading text="جاري تحميل المسار..." className="min-h-0" />
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard/routes")}>
          <ArrowLeft className="ml-2 h-4 w-4" />
          العودة لـ {labels.routeLabel}
        </Button>
        <p className="text-destructive">{error || "المسار غير موجود"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/dashboard/routes")}>
          <ArrowLeft className="ml-2 h-4 w-4" />
          العودة لـ {labels.routeLabel}
        </Button>
      </div>
      <RouteStatsPanel
        routeId={routeId}
        branchId={resolvedBranchId}
        routeName={route.name}
        routeColor={route.color}
        onLinkWorkSchedule={handleLinkWorkSchedule}
      />
    </div>
  );
}
