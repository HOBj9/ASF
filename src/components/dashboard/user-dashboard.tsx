"use client";

import { MunicipalityDashboard } from "./municipality-dashboard";

type UserDashboardProps = {
  isOrganizationAdmin?: boolean;
  organizationId?: string | null;
};

export function UserDashboard({ isOrganizationAdmin, organizationId }: UserDashboardProps) {
  return (
    <MunicipalityDashboard
      isOrganizationAdmin={isOrganizationAdmin}
      organizationId={organizationId}
    />
  );
}
