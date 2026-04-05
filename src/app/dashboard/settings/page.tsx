import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { isLineSupervisor, isOrganizationAdmin, isAdmin, isBranchAdmin } from '@/lib/permissions';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { ProfileManager } from '@/components/profile/profile-manager';
import { OrganizationLabelsSettings } from '@/components/settings/organization-labels-settings';
import { NotificationSettings } from '@/components/settings/notification-settings';
import { LineSupervisorsManager } from '@/components/dashboard/line-supervisors-manager';
import { TrackingEventDefinitionsManager } from '@/components/settings/tracking-event-definitions-manager';
import { getLabelsForSession } from '@/lib/utils/labels-server.util';
import { loadLineSupervisorsDataset } from '@/lib/server/line-supervisors-dataset';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  await connectDB();
  const user = await User.findById(session.user.id)
    .select('name email avatar businessName')
    .lean();

  const role = session.user.role as any;
  const hideLabelsAndNotifications = isLineSupervisor(role);
  const showManagementBlocks =
    !hideLabelsAndNotifications &&
    (isOrganizationAdmin(role) || isAdmin(role) || isBranchAdmin(role));

  const sessionBranchId = (session.user as { branchId?: string | null })?.branchId ?? null;

  let lineSupervisorsSection: ReactNode = null;
  if (showManagementBlocks) {
    try {
      const organizationId = await resolveOrganizationId(session);
      const labels = await getLabelsForSession(session);
      const { initialUsers, branches, vehicles } = await loadLineSupervisorsDataset(organizationId);
      lineSupervisorsSection = (
        <div>
          <h2 className="mb-3 text-xl font-semibold">
            {labels.lineSupervisorLabel || 'مشرفو الخط'}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            إدارة {labels.lineSupervisorLabel || 'مشرفي الخط'} وبياناتهم وربطهم بالفرع والمركبة.
            {!sessionBranchId
              ? ` على مستوى المؤسسة اختر ${labels.branchLabel || 'الفرع'} لعرض القائمة.`
              : ''}
          </p>
          <LineSupervisorsManager
            organizationId={organizationId}
            initialUsers={initialUsers}
            branches={branches}
            vehicles={vehicles}
            sessionBranchId={sessionBranchId}
          />
        </div>
      );
    } catch {
      lineSupervisorsSection = null;
    }
  }

  let trackingDefinitionsSection: ReactNode = null;
  if (showManagementBlocks) {
    try {
      const organizationId = await resolveOrganizationId(session);
      const Branch = (await import('@/models/Branch')).default;
      const branches = await Branch.find({ organizationId })
        .select('name nameAr _id')
        .sort({ name: 1 })
        .lean();

      trackingDefinitionsSection = (
        <TrackingEventDefinitionsManager
          organizationId={organizationId}
          branches={JSON.parse(JSON.stringify(branches))}
          sessionBranchId={sessionBranchId}
        />
      );
    } catch {
      trackingDefinitionsSection = null;
    }
  }

  return (
    <div className="space-y-8 text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl font-bold lg:text-3xl">الإعدادات</h1>
        <p className="mt-2 text-muted-foreground">
          {hideLabelsAndNotifications ? 'إدارة الملف الشخصي' : 'إدارة الملف الشخصي وإعدادات المؤسسة والتتبع'}
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-xl font-semibold">الملف الشخصي</h2>
        <ProfileManager
          initialUser={{
            id: session.user.id,
            name: user?.name || session.user.name || '',
            email: user?.email || session.user.email || '',
            avatar: user?.avatar || undefined,
            businessName: (user as any)?.businessName || undefined,
          }}
        />
      </div>

      {!hideLabelsAndNotifications && (
        <>
          <div>
            <h2 className="mb-3 text-xl font-semibold">تسميات المؤسسة</h2>
            <OrganizationLabelsSettings />
          </div>

          {lineSupervisorsSection}

          {trackingDefinitionsSection}

          <div>
            <h2 className="mb-3 text-xl font-semibold">تخصيص الإشعارات</h2>
            <NotificationSettings />
          </div>
        </>
      )}
    </div>
  );
}
