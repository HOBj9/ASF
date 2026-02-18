"use client";

import { MunicipalityDashboard } from "./municipality-dashboard";

type UserDashboardProps = {
  isOrganizationAdmin?: boolean;
  isLineSupervisor?: boolean;
  organizationId?: string | null;
  sessionBranchId?: string | null;
};

export function UserDashboard({
  isOrganizationAdmin,
  isLineSupervisor,
  organizationId,
  sessionBranchId,
}: UserDashboardProps) {
  return (
    <MunicipalityDashboard
      isOrganizationAdmin={isOrganizationAdmin}
      isLineSupervisor={isLineSupervisor}
      organizationId={organizationId}
      sessionBranchId={sessionBranchId}
    />
  );
}
