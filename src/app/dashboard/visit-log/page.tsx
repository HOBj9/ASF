import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission, isAdmin, isOrganizationAdmin } from '@/lib/permissions';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { VisitLogPanel } from '@/components/municipality/visit-log-panel';

export default async function VisitLogPage() {
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
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">سجل الزيارات</h1>
        <p className="text-muted-foreground mt-2">
          سجل الزيارة لكل نقطة والزيارات المكررة مع إمكانية التصفية والتصدير.
        </p>
      </div>

      <VisitLogPanel
        isSystemAdmin={adminUser}
        isOrganizationAdmin={isOrganizationAdmin(role)}
        organizationId={(session.user as any)?.organizationId ?? null}
        sessionBranchId={(session.user as any)?.branchId ?? null}
      />
    </div>
  );
}
