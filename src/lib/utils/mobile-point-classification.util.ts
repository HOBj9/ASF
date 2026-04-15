import { PointClassificationService } from '@/lib/services/point-classification.service';

export interface MobilePointClassificationItem {
  id: string;
  name: string;
  nameAr: string | null;
  primaryClassificationId: string | null;
  branchId: string | null;
  organizationId: string | null;
  order: number;
}

interface PointClassificationDocumentLike {
  _id: unknown;
  name?: unknown;
  nameAr?: unknown;
  primaryClassificationId?: unknown;
  branchId?: unknown;
  organizationId?: unknown;
  order?: unknown;
}

export function normalizeMobilePointClassification(
  item: PointClassificationDocumentLike
): MobilePointClassificationItem {
  return {
    id: String(item._id),
    name: typeof item.name === 'string' ? item.name : '',
    nameAr: typeof item.nameAr === 'string' ? item.nameAr : null,
    primaryClassificationId: item.primaryClassificationId
      ? String(item.primaryClassificationId)
      : null,
    branchId: item.branchId ? String(item.branchId) : null,
    organizationId: item.organizationId ? String(item.organizationId) : null,
    order: typeof item.order === 'number' ? item.order : 0,
  };
}

export async function listMobilePointClassifications(
  service: PointClassificationService,
  organizationId: string,
  branchId?: string | null
) {
  const [primaries, secondaries] = await Promise.all([
    listMobilePrimaryPointClassifications(service, organizationId, branchId),
    listMobileSecondaryPointClassifications(service, organizationId, branchId),
  ]);

  return {
    primaries,
    secondaries,
  };
}

export async function listMobilePrimaryPointClassifications(
  service: PointClassificationService,
  organizationId: string,
  branchId?: string | null
) {
  const primaries = branchId
    ? await service.listPrimariesForBranch(branchId)
    : await service.listPrimariesForOrganization(organizationId);

  return Array.isArray(primaries)
    ? primaries.map(normalizeMobilePointClassification)
    : [];
}

export async function listMobileSecondaryPointClassifications(
  service: PointClassificationService,
  organizationId: string,
  branchId?: string | null,
  primaryClassificationId?: string | null
) {
  const secondaries = branchId
    ? await service.listSecondariesForBranch(branchId, primaryClassificationId)
    : await service.listSecondariesForOrganization(organizationId, primaryClassificationId);

  return Array.isArray(secondaries)
    ? secondaries.map(normalizeMobilePointClassification)
    : [];
}

export function filterMobileSecondariesByPrimary(
  secondaries: MobilePointClassificationItem[],
  primaryClassificationId?: string | null
) {
  const normalizedPrimaryId = String(primaryClassificationId || '').trim();
  if (!normalizedPrimaryId) {
    return secondaries;
  }

  return secondaries.filter(
    (item) => String(item.primaryClassificationId || '') === normalizedPrimaryId
  );
}
