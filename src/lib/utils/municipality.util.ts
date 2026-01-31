import { isAdmin } from '@/lib/permissions';

export function resolveMunicipalityId(
  session: any,
  providedMunicipalityId?: string | null
): string {
  const sessionMunicipalityId = session?.user?.municipalityId || null;
  const role = session?.user?.role || null;

  if (isAdmin(role)) {
    const resolved = providedMunicipalityId || sessionMunicipalityId;
    if (!resolved) {
      throw new Error('يرجى تحديد البلدية');
    }
    return resolved;
  }

  if (!sessionMunicipalityId) {
    throw new Error('لا يوجد بلدية مرتبطة بالحساب');
  }

  return sessionMunicipalityId;
}
