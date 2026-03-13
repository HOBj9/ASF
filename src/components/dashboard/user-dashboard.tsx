"use client";

import { MunicipalityDashboard } from "./municipality-dashboard";
import type { DashboardOverviewData } from "@/lib/contracts/dashboard";

type UserDashboardProps = {
  isOrganizationAdmin?: boolean;
  isLineSupervisor?: boolean;
  organizationId?: string | null;
  sessionBranchId?: string | null;
  initialOverview?: DashboardOverviewData | null;
};

export function UserDashboard({
  isOrganizationAdmin,
  isLineSupervisor,
  organizationId,
  sessionBranchId,
  initialOverview,
}: UserDashboardProps) {
  return (
    <MunicipalityDashboard
      isOrganizationAdmin={isOrganizationAdmin}
      isLineSupervisor={isLineSupervisor}
      organizationId={organizationId}
      sessionBranchId={sessionBranchId}
      initialOverview={initialOverview}
    />
  );
}
