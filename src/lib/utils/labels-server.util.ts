/**
 * Server-only: fetches labels from DB. Do not import in client components.
 */
import Organization from '@/models/Organization';
import Branch from '@/models/Branch';
import connectDB from '@/lib/mongodb';
import { defaultLabels, sanitizeLabels, type Labels } from '@/lib/utils/labels.util';

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
  let merged: Record<string, string> = { ...defaultLabels };
  if (organization?.labels && typeof organization.labels === 'object') {
    merged = { ...merged, ...organization.labels };
  }

  if (branchId) {
    const branch = await Branch.findById(branchId).select('labels').lean();
    if (branch?.labels && typeof branch.labels === 'object') {
      merged = { ...merged, ...branch.labels };
    }
  }

  return sanitizeLabels(merged);
}
