import Material from '@/models/Material';
import MaterialAttributeDefinition from '@/models/MaterialAttributeDefinition';
import MaterialAttributeValue from '@/models/MaterialAttributeValue';
import MaterialCategory from '@/models/MaterialCategory';
import MaterialCategoryLink from '@/models/MaterialCategoryLink';
import Unit from '@/models/Unit';

export type CloneMaterialTreeStats = {
  units: number;
  categories: number;
  attributes: number;
  materials: number;
  links: number;
  values: number;
};

export type CloneMaterialTreeResult = {
  created: boolean;
  reason?: 'branch_has_data' | 'org_empty';
  stats: CloneMaterialTreeStats;
};

const emptyStats: CloneMaterialTreeStats = {
  units: 0,
  categories: 0,
  attributes: 0,
  materials: 0,
  links: 0,
  values: 0,
};

export async function cloneOrganizationMaterialTreeToBranch(
  organizationId: string,
  branchId: string
): Promise<CloneMaterialTreeResult> {
  const [unitCount, categoryCount, materialCount] = await Promise.all([
    Unit.countDocuments({ organizationId, branchId, pointId: null }),
    MaterialCategory.countDocuments({ organizationId, branchId, pointId: null }),
    Material.countDocuments({ organizationId, branchId, pointId: null }),
  ]);

  if (unitCount > 0 || categoryCount > 0 || materialCount > 0) {
    return { created: false, reason: 'branch_has_data', stats: { ...emptyStats } };
  }

  const [orgUnits, orgCategories, orgMaterials] = await Promise.all([
    Unit.find({ organizationId, branchId: null }).lean(),
    MaterialCategory.find({ organizationId, branchId: null }).lean(),
    Material.find({ organizationId, branchId: null }).lean(),
  ]);

  if (orgUnits.length === 0 && orgCategories.length === 0 && orgMaterials.length === 0) {
    return { created: false, reason: 'org_empty', stats: { ...emptyStats } };
  }

  const stats: CloneMaterialTreeStats = { ...emptyStats };

  const unitMap = new Map<string, string>();
  if (orgUnits.length > 0) {
    const createdUnits = await Unit.insertMany(
      orgUnits.map((unit) => ({
        organizationId,
        branchId,
        pointId: null,
        originUnitId: unit._id,
        name: unit.name,
        nameAr: unit.nameAr || null,
        symbol: unit.symbol || null,
        baseUnitId: null,
        factor: unit.factor || 1,
        isActive: unit.isActive !== false,
        isOverride: false,
      }))
    );
    stats.units = createdUnits.length;
    createdUnits.forEach((doc, index) => {
      unitMap.set(String(orgUnits[index]._id), String(doc._id));
    });

    const baseUnitUpdates = orgUnits
      .map((unit, index) => {
        if (!unit.baseUnitId) return null;
        return {
          id: String(createdUnits[index]._id),
          baseUnitId: unitMap.get(String(unit.baseUnitId)) || null,
        };
      })
      .filter(Boolean) as Array<{ id: string; baseUnitId: string | null }>;

    for (const update of baseUnitUpdates) {
      await Unit.findByIdAndUpdate(update.id, { baseUnitId: update.baseUnitId }).exec();
    }
  }

  const categoryMap = new Map<string, string>();
  if (orgCategories.length > 0) {
    const byId = new Map<string, any>();
    orgCategories.forEach((cat) => byId.set(String(cat._id), cat));

    const depthCache = new Map<string, number>();
    const getDepth = (cat: any): number => {
      const id = String(cat._id);
      if (depthCache.has(id)) return depthCache.get(id) as number;
      if (!cat.parentId) {
        depthCache.set(id, 0);
        return 0;
      }
      const parent = byId.get(String(cat.parentId));
      const depth = parent ? getDepth(parent) + 1 : 0;
      depthCache.set(id, depth);
      return depth;
    };

    const sorted = orgCategories
      .slice()
      .sort((a, b) => getDepth(a) - getDepth(b) || (a.sortOrder || 0) - (b.sortOrder || 0));

    for (const cat of sorted) {
      const parentId = cat.parentId ? categoryMap.get(String(cat.parentId)) || null : null;
      const created = await MaterialCategory.create({
        organizationId,
        branchId,
        pointId: null,
        parentId,
        originCategoryId: cat._id,
        name: cat.name,
        nameAr: cat.nameAr || null,
        depth: typeof cat.depth === 'number' ? cat.depth : getDepth(cat),
        sortOrder: cat.sortOrder || 0,
        isActive: cat.isActive !== false,
        isOverride: false,
      });
      categoryMap.set(String(cat._id), String(created._id));
    }
    stats.categories = categoryMap.size;
  }

  const attributeMap = new Map<string, string>();
  if (orgCategories.length > 0) {
    const orgAttributes = await MaterialAttributeDefinition.find({
      categoryId: { $in: orgCategories.map((c) => c._id) },
    }).lean();

    if (orgAttributes.length > 0) {
      const payload = orgAttributes
        .map((attr) => {
          const mappedCategoryId = categoryMap.get(String(attr.categoryId));
          if (!mappedCategoryId) return null;
          const mappedUnitId = attr.unitId ? unitMap.get(String(attr.unitId)) || null : null;
          return {
            sourceId: String(attr._id),
            doc: {
              categoryId: mappedCategoryId,
              originAttributeId: attr._id,
              name: attr.name,
              type: attr.type,
              required: attr.required,
              options: attr.options || [],
              unitId: mappedUnitId,
              isActive: attr.isActive !== false,
              isOverride: false,
            },
          };
        })
        .filter(Boolean) as Array<{ sourceId: string; doc: any }>;

      if (payload.length > 0) {
        const createdAttributes = await MaterialAttributeDefinition.insertMany(payload.map((p) => p.doc));
        createdAttributes.forEach((doc, index) => {
          attributeMap.set(payload[index].sourceId, String(doc._id));
        });
        stats.attributes = createdAttributes.length;
      }
    }
  }

  const materialMap = new Map<string, string>();
  if (orgMaterials.length > 0) {
    const createdMaterials = await Material.insertMany(
      orgMaterials.map((material) => ({
        organizationId,
        branchId,
        pointId: null,
        originMaterialId: material._id,
        name: material.name,
        nameAr: material.nameAr || null,
        sku: material.sku,
        baseUnitId: material.baseUnitId ? unitMap.get(String(material.baseUnitId)) || null : null,
        isActive: material.isActive !== false,
        isOverride: false,
      }))
    );
    stats.materials = createdMaterials.length;
    createdMaterials.forEach((doc, index) => {
      materialMap.set(String(orgMaterials[index]._id), String(doc._id));
    });
  }

  if (materialMap.size > 0) {
    const orgMaterialIds = Array.from(materialMap.keys());
    const orgLinks = await MaterialCategoryLink.find({
      materialId: { $in: orgMaterialIds },
    }).lean();

    if (orgLinks.length > 0) {
      const payload = orgLinks
        .map((link) => {
          const mappedMaterialId = materialMap.get(String(link.materialId));
          const mappedCategoryId = categoryMap.get(String(link.categoryId));
          if (!mappedMaterialId || !mappedCategoryId) return null;
          return {
            materialId: mappedMaterialId,
            categoryId: mappedCategoryId,
            isPrimary: link.isPrimary,
          };
        })
        .filter(Boolean);

      if (payload.length > 0) {
        const createdLinks = await MaterialCategoryLink.insertMany(payload);
        stats.links = createdLinks.length;
      }
    }

    const orgValues = await MaterialAttributeValue.find({
      materialId: { $in: orgMaterialIds },
    }).lean();

    if (orgValues.length > 0) {
      const payload = orgValues
        .map((value) => {
          const mappedMaterialId = materialMap.get(String(value.materialId));
          const mappedAttributeId = attributeMap.get(String(value.attributeId));
          if (!mappedMaterialId || !mappedAttributeId) return null;
          return {
            materialId: mappedMaterialId,
            attributeId: mappedAttributeId,
            value: value.value,
          };
        })
        .filter(Boolean);

      if (payload.length > 0) {
        const createdValues = await MaterialAttributeValue.insertMany(payload);
        stats.values = createdValues.length;
      }
    }
  }

  return { created: true, stats };
}

export async function cloneBranchMaterialTreeToPoint(
  organizationId: string,
  branchId: string,
  pointId: string
): Promise<CloneMaterialTreeResult> {
  const [unitCount, categoryCount, materialCount] = await Promise.all([
    Unit.countDocuments({ organizationId, branchId, pointId }),
    MaterialCategory.countDocuments({ organizationId, branchId, pointId }),
    Material.countDocuments({ organizationId, branchId, pointId }),
  ]);

  if (unitCount > 0 || categoryCount > 0 || materialCount > 0) {
    return { created: false, reason: 'branch_has_data', stats: { ...emptyStats } };
  }

  const [branchUnits, branchCategories, branchMaterials] = await Promise.all([
    Unit.find({ organizationId, branchId, pointId: null }).lean(),
    MaterialCategory.find({ organizationId, branchId, pointId: null }).lean(),
    Material.find({ organizationId, branchId, pointId: null }).lean(),
  ]);

  if (branchUnits.length === 0 && branchCategories.length === 0 && branchMaterials.length === 0) {
    return { created: false, reason: 'org_empty', stats: { ...emptyStats } };
  }

  const stats: CloneMaterialTreeStats = { ...emptyStats };

  const unitMap = new Map<string, string>();
  if (branchUnits.length > 0) {
    const createdUnits = await Unit.insertMany(
      branchUnits.map((unit) => ({
        organizationId,
        branchId,
        pointId,
        originUnitId: unit._id,
        name: unit.name,
        nameAr: unit.nameAr || null,
        symbol: unit.symbol || null,
        baseUnitId: null,
        factor: unit.factor || 1,
        isActive: unit.isActive !== false,
        isOverride: false,
      }))
    );
    stats.units = createdUnits.length;
    createdUnits.forEach((doc, index) => {
      unitMap.set(String(branchUnits[index]._id), String(doc._id));
    });

    const baseUnitUpdates = branchUnits
      .map((unit, index) => {
        if (!unit.baseUnitId) return null;
        return {
          id: String(createdUnits[index]._id),
          baseUnitId: unitMap.get(String(unit.baseUnitId)) || null,
        };
      })
      .filter(Boolean) as Array<{ id: string; baseUnitId: string | null }>;

    for (const update of baseUnitUpdates) {
      await Unit.findByIdAndUpdate(update.id, { baseUnitId: update.baseUnitId }).exec();
    }
  }

  const categoryMap = new Map<string, string>();
  if (branchCategories.length > 0) {
    const byId = new Map<string, any>();
    branchCategories.forEach((cat) => byId.set(String(cat._id), cat));

    const depthCache = new Map<string, number>();
    const getDepth = (cat: any): number => {
      const id = String(cat._id);
      if (depthCache.has(id)) return depthCache.get(id) as number;
      if (!cat.parentId) {
        depthCache.set(id, 0);
        return 0;
      }
      const parent = byId.get(String(cat.parentId));
      const depth = parent ? getDepth(parent) + 1 : 0;
      depthCache.set(id, depth);
      return depth;
    };

    const sorted = branchCategories
      .slice()
      .sort((a, b) => getDepth(a) - getDepth(b) || (a.sortOrder || 0) - (b.sortOrder || 0));

    for (const cat of sorted) {
      const parentId = cat.parentId ? categoryMap.get(String(cat.parentId)) || null : null;
      const created = await MaterialCategory.create({
        organizationId,
        branchId,
        pointId,
        parentId,
        originCategoryId: cat._id,
        name: cat.name,
        nameAr: cat.nameAr || null,
        depth: typeof cat.depth === 'number' ? cat.depth : getDepth(cat),
        sortOrder: cat.sortOrder || 0,
        isActive: cat.isActive !== false,
        isOverride: false,
      });
      categoryMap.set(String(cat._id), String(created._id));
    }
    stats.categories = categoryMap.size;
  }

  const attributeMap = new Map<string, string>();
  if (branchCategories.length > 0) {
    const branchAttributes = await MaterialAttributeDefinition.find({
      categoryId: { $in: branchCategories.map((c) => c._id) },
    }).lean();

    if (branchAttributes.length > 0) {
      const payload = branchAttributes
        .map((attr) => {
          const mappedCategoryId = categoryMap.get(String(attr.categoryId));
          if (!mappedCategoryId) return null;
          const mappedUnitId = attr.unitId ? unitMap.get(String(attr.unitId)) || null : null;
          return {
            sourceId: String(attr._id),
            doc: {
              categoryId: mappedCategoryId,
              originAttributeId: attr._id,
              name: attr.name,
              type: attr.type,
              required: attr.required,
              options: attr.options || [],
              unitId: mappedUnitId,
              isActive: attr.isActive !== false,
              isOverride: false,
            },
          };
        })
        .filter(Boolean) as Array<{ sourceId: string; doc: any }>;

      if (payload.length > 0) {
        const createdAttributes = await MaterialAttributeDefinition.insertMany(payload.map((p) => p.doc));
        createdAttributes.forEach((doc, index) => {
          attributeMap.set(payload[index].sourceId, String(doc._id));
        });
        stats.attributes = createdAttributes.length;
      }
    }
  }

  const materialMap = new Map<string, string>();
  if (branchMaterials.length > 0) {
    const createdMaterials = await Material.insertMany(
      branchMaterials.map((material) => ({
        organizationId,
        branchId,
        pointId,
        originMaterialId: material._id,
        name: material.name,
        nameAr: material.nameAr || null,
        sku: material.sku,
        baseUnitId: material.baseUnitId ? unitMap.get(String(material.baseUnitId)) || null : null,
        isActive: material.isActive !== false,
        isOverride: false,
      }))
    );
    stats.materials = createdMaterials.length;
    createdMaterials.forEach((doc, index) => {
      materialMap.set(String(branchMaterials[index]._id), String(doc._id));
    });
  }

  if (materialMap.size > 0) {
    const branchMaterialIds = Array.from(materialMap.keys());
    const branchLinks = await MaterialCategoryLink.find({
      materialId: { $in: branchMaterialIds },
    }).lean();

    if (branchLinks.length > 0) {
      const payload = branchLinks
        .map((link) => {
          const mappedMaterialId = materialMap.get(String(link.materialId));
          const mappedCategoryId = categoryMap.get(String(link.categoryId));
          if (!mappedMaterialId || !mappedCategoryId) return null;
          return {
            materialId: mappedMaterialId,
            categoryId: mappedCategoryId,
            isPrimary: link.isPrimary,
          };
        })
        .filter(Boolean);

      if (payload.length > 0) {
        const createdLinks = await MaterialCategoryLink.insertMany(payload);
        stats.links = createdLinks.length;
      }
    }

    const branchValues = await MaterialAttributeValue.find({
      materialId: { $in: branchMaterialIds },
    }).lean();

    if (branchValues.length > 0) {
      const payload = branchValues
        .map((value) => {
          const mappedMaterialId = materialMap.get(String(value.materialId));
          const mappedAttributeId = attributeMap.get(String(value.attributeId));
          if (!mappedMaterialId || !mappedAttributeId) return null;
          return {
            materialId: mappedMaterialId,
            attributeId: mappedAttributeId,
            value: value.value,
          };
        })
        .filter(Boolean);

      if (payload.length > 0) {
        const createdValues = await MaterialAttributeValue.insertMany(payload);
        stats.values = createdValues.length;
      }
    }
  }

  return { created: true, stats };
}
