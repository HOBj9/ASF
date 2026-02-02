import Organization from '@/models/Organization';
import Branch from '@/models/Branch';
import connectDB from '@/lib/mongodb';

export type Labels = {
  branchLabel: string;
  pointLabel: string;
  vehicleLabel: string;
  driverLabel: string;
  routeLabel: string;
};

const defaultLabels: Labels = {
  branchLabel: 'فرع',
  pointLabel: 'نقاط',
  vehicleLabel: 'مركبات',
  driverLabel: 'سائقين',
  routeLabel: 'مسارات',
};

export async function getLabelsForSession(session: any): Promise<Labels> {
  if (!session?.user) return defaultLabels;

  const organizationId = session.user.organizationId || null;
  const branchId = session.user.branchId || null;

  await connectDB();

  let orgId = organizationId;
  if (!orgId && branchId) {
    const branch = await Branch.findById(branchId).select('organizationId').lean();
    if (branch?.organizationId) {
      orgId = String(branch.organizationId);
    }
  }

  if (!orgId) return defaultLabels;

  const organization = await Organization.findById(orgId).select('labels').lean();
  if (!organization?.labels) return defaultLabels;

  return { ...defaultLabels, ...organization.labels };
}

