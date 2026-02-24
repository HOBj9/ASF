import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission, isAdmin, isOrganizationAdmin } from '@/lib/permissions';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { EventReportsPanel } from '@/components/municipality/event-reports-panel';
import { EventReportsPageHeader } from './event-reports-page-header';

export default async function EventReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  const role = session.user.role as any;
  const adminUser = isAdmin(role);

  if (!adminUser && !hasPermission(role, permissionResources.REPORTS, permissionActions.READ)) {
    redirect('/unauthorized');
  }

  return (
    <div className="text-right">
      <EventReportsPageHeader />

      <EventReportsPanel
        isSystemAdmin={adminUser}
        isOrganizationAdmin={isOrganizationAdmin(role)}
        organizationId={(session.user as any)?.organizationId ?? null}
        sessionBranchId={(session.user as any)?.branchId ?? null}
      />
    </div>
  );
}

